// 토큰 JSON이 spec #16의 "검증 규칙"을 지키는지 검사한다. 위반은 첫 번째에서 멈추지 않고 모두 모은다.
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import {
  COLOR_SCHEMES,
  tokenFilePaths,
  type ColorScheme,
} from "./build-tokens.helper.ts";

/** 검증 규칙의 이름. 오류 메시지에 나오고, README의 규칙 표와 같다 */
export type RuleName =
  | "primitive-real-value"
  | "semantic-alias"
  | "semantic-color"
  | "semantic-names-match"
  | "path-structure"
  | "kebab-case"
  | "css-name-unique"
  | "color-srgb"
  | "dimension-px"
  | "reference-exists"
  | "reference-no-cycle";

/** 규칙 하나를 어긴 토큰 하나 */
export interface Violation {
  /** 토큰 폴더 기준 파일 경로. 예: `semantic/light.json` */
  file: string;
  /** 토큰 경로를 `.`로 이은 것. 예: `color.gray.900` */
  path: string;
  rule: RuleName;
  /** 무엇이 잘못됐는지 사람이 읽는 설명 */
  detail: string;
}

/** 토큰 JSON이 규칙을 어겼을 때 빌드가 던지는 오류. 위반을 모두 담는다 */
export class TokenValidationError extends Error {
  readonly violations: readonly Violation[];

  constructor(violations: readonly Violation[]) {
    super(
      [
        `토큰 JSON이 규칙을 ${violations.length}곳에서 어겼다.`,
        ...violations.map(
          ({ file, path, rule, detail }) =>
            `  ${file} ${path} [${rule}] ${detail}`,
        ),
      ].join("\n"),
    );
    this.name = "TokenValidationError";
    this.violations = violations;
  }
}

/** JSON에서 읽은 토큰 하나 */
interface Token {
  path: readonly string[];
  /** 자신이나 가장 가까운 조상 그룹에 선언된 `$type` */
  type: unknown;
  value: unknown;
  extensions: unknown;
}

/** 토큰 파일 하나에서 읽은 토큰 */
interface TokenFile {
  /** 토큰 폴더 기준 파일 경로 */
  file: string;
  tokens: Token[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** DTCG 참조 문자열(`{color.gray.900}`)인지 */
const isReference = (value: unknown): value is string =>
  typeof value === "string" && /^\{[^{}]+\}$/.test(value);

/**
 * DTCG 그룹을 따라 내려가며 토큰을 모은다. `$value`가 있는 객체가 토큰이고, 없는 객체는 그룹이다.
 * `$`로 시작하는 키는 속성이라 건너뛴다. 그룹의 `$type`은 하위 토큰이 물려받는다.
 */
function collectTokens({
  group,
  path,
  inheritedType,
}: {
  group: Record<string, unknown>;
  path: readonly string[];
  inheritedType: unknown;
}): Token[] {
  const type = group.$type ?? inheritedType;
  return Object.entries(group).flatMap(([key, child]) => {
    if (key.startsWith("$") || !isObject(child)) return [];
    const childPath = [...path, key];
    if ("$value" in child) {
      return [
        {
          path: childPath,
          type: child.$type ?? type,
          value: child.$value,
          extensions: child.$extensions,
        },
      ];
    }
    return collectTokens({
      group: child,
      path: childPath,
      inheritedType: type,
    });
  });
}

async function readTokenFile({
  tokensDir,
  path,
}: {
  tokensDir: string;
  path: string;
}): Promise<TokenFile> {
  const file = relative(tokensDir, path);
  const text = await readFile(path, "utf8");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`${file}: JSON을 읽지 못했다`, { cause: error });
  }
  if (!isObject(json)) {
    throw new Error(`${file}: 최상위가 객체가 아니다`);
  }
  return {
    file,
    tokens: collectTokens({ group: json, path: [], inheritedType: undefined }),
  };
}

/** 토큰 경로를 `.`로 잇는다. 참조 문자열의 중괄호 안과 같은 모양이다. 예: `color.gray.900` */
const getTokenPath = (token: Token): string => token.path.join(".");

/** 다른 위반의 설명에 쓰는 토큰의 위치. 예: `semantic/light.json alpha.90` */
const getTokenLocation = ({
  file,
  token,
}: {
  file: string;
  token: Token;
}): string => `${file} ${getTokenPath(token)}`;

/** `file`의 `token`이 `rule`을 어겼다는 위반을 만든다 */
const toViolation = ({
  file,
  token,
  rule,
  detail,
}: {
  file: string;
  token: Token;
  rule: RuleName;
  detail: string;
}): Violation => ({ file, path: getTokenPath(token), rule, detail });

/** `$extensions.gyeol.alias`("alias + 투명도")를 읽는다. 없으면 undefined다. 모양은 검사하지 않는다 */
const getAliasExtension = (token: Token): unknown =>
  isObject(token.extensions) && isObject(token.extensions.gyeol)
    ? token.extensions.gyeol.alias
    : undefined;

/** Primitive는 실제 값만 둔다. alias와 "alias + 투명도"를 쓰지 않는다. 색 값 자체의 alpha는 실제 값이라 허용한다 */
function checkPrimitiveRealValue({ file, tokens }: TokenFile): Violation[] {
  return tokens.flatMap((token) => {
    const rule = "primitive-real-value";
    if (isReference(token.value)) {
      return toViolation({
        file,
        token,
        rule,
        detail: `Primitive는 실제 값만 둔다. alias ${token.value}를 쓸 수 없다`,
      });
    }
    if (getAliasExtension(token) !== undefined) {
      return toViolation({
        file,
        token,
        rule,
        detail:
          "Primitive는 실제 값만 둔다. alias + 투명도($extensions.gyeol.alias)를 쓸 수 없다",
      });
    }
    return [];
  });
}

/** "alias + 투명도"의 참조 대상. 확장이 없거나 ref가 참조 문자열이 아니면 undefined다 */
function getAliasRef(token: Token): string | undefined {
  const alias = getAliasExtension(token);
  return isObject(alias) && isReference(alias.ref) ? alias.ref : undefined;
}

/**
 * Semantic은 모든 칸이 Primitive나 다른 Semantic을 가리키는 alias다.
 * `$value`가 참조 문자열이거나, "alias + 투명도" 확장의 ref가 참조 문자열이어야 한다.
 */
function checkSemanticAlias({ file, tokens }: TokenFile): Violation[] {
  return tokens.flatMap((token) => {
    const rule = "semantic-alias";
    if (getAliasExtension(token) !== undefined) {
      if (getAliasRef(token) !== undefined) return [];
      return toViolation({
        file,
        token,
        rule,
        detail:
          '$extensions.gyeol.alias의 ref가 참조 문자열(예: "{bg-surface}")이 아니다',
      });
    }
    if (isReference(token.value)) return [];
    return toViolation({
      file,
      token,
      rule,
      detail:
        'Semantic은 Primitive나 다른 Semantic을 가리키는 alias(예: "{color.gray.900}")여야 한다',
    });
  });
}

/** Semantic의 타입은 색만 허용한다 */
function checkSemanticColor({ file, tokens }: TokenFile): Violation[] {
  return tokens.flatMap((token) =>
    token.type === "color"
      ? []
      : toViolation({
          file,
          token,
          rule: "semantic-color",
          detail: `Semantic의 $type은 color여야 한다. 지금은 ${JSON.stringify(token.type) ?? "없음"}이다`,
        }),
  );
}

/**
 * 경로 단계 수를 검사한다. 경로는 최대 3단계이고, 그룹은 collection마다 정한 단계까지만 둔다.
 * - Primitive: 범주 / (그룹) / 이름. 2–3단계 (`spacing.4`, `color.gray.900`)
 * - Semantic: (그룹) / 이름. 1–2단계 (`bg-surface`, `alpha.90`)
 */
function checkPathStructure({
  tokenFile: { file, tokens },
  minDepth,
  maxDepth,
  shape,
}: {
  tokenFile: TokenFile;
  minDepth: number;
  maxDepth: number;
  /** 오류 메시지에 쓰는 경로 모양. 예: `범주/(그룹)/이름` */
  shape: string;
}): Violation[] {
  return tokens.flatMap((token) =>
    token.path.length >= minDepth && token.path.length <= maxDepth
      ? []
      : toViolation({
          file,
          token,
          rule: "path-structure",
          detail: `경로는 ${shape}(${minDepth}–${maxDepth}단계)여야 한다. 지금은 ${token.path.length}단계다`,
        }),
  );
}

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** 경로의 모든 이름 칸은 kebab-case다 */
function checkKebabCase({ file, tokens }: TokenFile): Violation[] {
  return tokens.flatMap((token) => {
    const invalid = token.path.filter((name) => !KEBAB_CASE.test(name));
    return invalid.length === 0
      ? []
      : toViolation({
          file,
          token,
          rule: "kebab-case",
          detail: `경로의 이름 칸은 kebab-case(소문자, 숫자, -)여야 한다: ${invalid.join(", ")}`,
        });
  });
}

/**
 * 모든 Color Scheme 파일에 같은 Semantic 이름이 있어야 한다.
 * 다른 파일에는 있는데 이 파일에 없는 토큰을, 이 파일의 위반으로 알린다.
 */
function checkSemanticNamesMatch(
  semantic: Record<ColorScheme, TokenFile>,
): Violation[] {
  const getPaths = ({ tokens }: TokenFile): Set<string> =>
    new Set(tokens.map(getTokenPath));
  return COLOR_SCHEMES.flatMap((colorScheme) => {
    const { file } = semantic[colorScheme];
    const own = getPaths(semantic[colorScheme]);
    return COLOR_SCHEMES.filter((other) => other !== colorScheme).flatMap(
      (other) =>
        semantic[other].tokens
          .filter((token) => !own.has(getTokenPath(token)))
          .map((token) =>
            toViolation({
              file,
              token,
              rule: "semantic-names-match",
              detail: `${semantic[other].file}에 있는 Semantic이 이 파일에 없다`,
            }),
          ),
    );
  });
}

/**
 * 실제 값의 형식을 검사한다. 색은 `srgb` 색 객체, dimension은 unit이 `px`인 객체다.
 * 참조 문자열은 참조 대상에서 검사하므로 건너뛴다. "alias + 투명도"의 `$value`(계산한 색)도 검사한다.
 */
function checkValueFormat({ file, tokens }: TokenFile): Violation[] {
  return tokens.flatMap((token) => {
    if (isReference(token.value)) return [];
    if (
      token.type === "color" &&
      !(isObject(token.value) && token.value.colorSpace === "srgb")
    ) {
      return toViolation({
        file,
        token,
        rule: "color-srgb",
        detail: `색은 srgb 색 객체({ "colorSpace": "srgb", "components": [r, g, b] })여야 한다. 지금은 ${JSON.stringify(token.value)}이다`,
      });
    }
    if (
      token.type === "dimension" &&
      !(isObject(token.value) && token.value.unit === "px")
    ) {
      return toViolation({
        file,
        token,
        rule: "dimension-px",
        detail: `dimension은 { "value": 숫자, "unit": "px" }여야 한다. 지금은 ${JSON.stringify(token.value)}이다`,
      });
    }
    return [];
  });
}

/** 토큰이 가리키는 참조. `$value`의 참조 문자열과 "alias + 투명도"의 ref다. 예: `{bg-surface}` */
const getReferences = (token: Token): string[] =>
  [token.value, getAliasRef(token)].filter(isReference);

/** 참조 문자열이 가리키는 토큰 경로. 예: `{color.gray.900}` → `color.gray.900` */
const getReferencePath = (reference: string): string => reference.slice(1, -1);

/**
 * 참조 대상이 존재해야 한다. Semantic은 Primitive와 같은 Color Scheme 파일의 Semantic을 가리킬 수 있다.
 * 그룹을 가리키면 토큰이 아니므로 없는 것으로 본다.
 */
function checkReferenceExists({
  tokenFile: { file, tokens },
  targets,
}: {
  tokenFile: TokenFile;
  /** 가리킬 수 있는 토큰 경로 */
  targets: ReadonlySet<string>;
}): Violation[] {
  return tokens.flatMap((token) => {
    const missing = getReferences(token).filter(
      (reference) => !targets.has(getReferencePath(reference)),
    );
    return missing.length === 0
      ? []
      : toViolation({
          file,
          token,
          rule: "reference-exists",
          detail: `참조 대상 토큰이 없다: ${missing.join(", ")}`,
        });
  });
}

/**
 * 참조에 순환이 없어야 한다. 순환은 Semantic끼리만 생긴다(Primitive는 참조하지 않는다).
 * 찾은 순환을 알리는 위치는 순환에 든 토큰 중 파일에서 가장 앞의 토큰이다.
 * 한 번 다 따라간 토큰은 다시 따라가지 않으므로, 토큰을 함께 쓰는 순환이 여럿이면 일부만 나올 수 있다.
 * 순환이 하나라도 있으면 반드시 하나 이상 나온다.
 */
function checkReferenceNoCycle({ file, tokens }: TokenFile): Violation[] {
  const byPath = new Map(tokens.map((token) => [getTokenPath(token), token]));
  const order = [...byPath.keys()];
  const getNext = (path: string): string[] =>
    getReferences(byPath.get(path)!)
      .map(getReferencePath)
      .filter((next) => byPath.has(next));

  const violations: Violation[] = [];
  const done = new Set<string>();
  // 깊이 우선으로 따라가며, 지금 따라가는 중인 경로(stack)로 돌아오면 순환이다
  const visit = ({
    path,
    stack,
  }: {
    path: string;
    stack: readonly string[];
  }): void => {
    if (done.has(path)) return;
    const start = stack.indexOf(path);
    if (start !== -1) {
      // 순환을 파일에서 가장 앞의 토큰부터 시작하도록 돌린다
      const found = stack.slice(start);
      const first = found.reduce((a, b) =>
        order.indexOf(a) <= order.indexOf(b) ? a : b,
      );
      const at = found.indexOf(first);
      const cycle = [...found.slice(at), ...found.slice(0, at)];
      violations.push(
        toViolation({
          file,
          token: byPath.get(cycle[0]!)!,
          rule: "reference-no-cycle",
          detail: `참조가 순환한다: ${[...cycle, cycle[0]].join(" → ")}`,
        }),
      );
      return;
    }
    for (const next of getNext(path)) {
      visit({ path: next, stack: [...stack, path] });
    }
    done.add(path);
  };
  for (const path of byPath.keys()) visit({ path, stack: [] });
  return violations;
}

/**
 * CSS 변수 이름에서 접두사(`--gyeol-`)를 뺀 부분. Style Dictionary의 name/kebab처럼 경로를 `-`로 잇는다.
 * kebab-case가 아닌 이름 칸은 kebab-case 규칙이 따로 알린다.
 */
const getCssName = (token: Token): string => token.path.join("-");

/**
 * 모든 토큰의 CSS 변수 이름이 서로 달라야 한다 (`alpha.90`과 `alpha-90`은 모두 `--gyeol-alpha-90`).
 * `tokenFile`의 토큰을 앞에서부터 보며, `taken`(이미 쓰인 이름 → 그 토큰의 위치)이나 같은 파일의 앞 토큰과 겹치면 알린다.
 */
function checkCssNameUnique({
  tokenFile: { file, tokens },
  taken,
}: {
  tokenFile: TokenFile;
  taken: ReadonlyMap<string, string>;
}): Violation[] {
  const seen = new Map(taken);
  return tokens.flatMap((token) => {
    const name = getCssName(token);
    const owner = seen.get(name);
    if (owner === undefined) {
      seen.set(name, getTokenLocation({ file, token }));
      return [];
    }
    return toViolation({
      file,
      token,
      rule: "css-name-unique",
      detail: `CSS 변수 이름 --gyeol-${name}이 ${owner}와 겹친다`,
    });
  });
}

/** 파일의 토큰이 쓰는 CSS 변수 이름 → 그 토큰의 위치. 이름이 겹치면 앞의 토큰을 남긴다 */
const getCssNames = ({ file, tokens }: TokenFile): Map<string, string> =>
  new Map(
    tokens
      .toReversed()
      .map((token) => [getCssName(token), getTokenLocation({ file, token })]),
  );

/**
 * 토큰 폴더의 토큰 파일을 읽어 검증 규칙을 모두 검사한다. 위반이 하나라도 있으면 모두 담아 TokenValidationError를 던진다.
 * 파일이 없거나 JSON이 아니면 규칙 위반이 아니라 일반 오류로 실패한다.
 */
export async function validateTokens(tokensDir: string): Promise<void> {
  const paths = tokenFilePaths(tokensDir);
  const primitive = await readTokenFile({ tokensDir, path: paths.primitive });
  const semantic: Record<ColorScheme, TokenFile> = {
    light: await readTokenFile({ tokensDir, path: paths.semantic.light }),
    dark: await readTokenFile({ tokensDir, path: paths.semantic.dark }),
  };

  const violations = [
    ...checkPrimitiveRealValue(primitive),
    ...checkPathStructure({
      tokenFile: primitive,
      minDepth: 2,
      maxDepth: 3,
      shape: "범주/(그룹)/이름",
    }),
    ...checkKebabCase(primitive),
    ...checkValueFormat(primitive),
    ...checkCssNameUnique({ tokenFile: primitive, taken: new Map() }),
    ...COLOR_SCHEMES.flatMap((colorScheme) => [
      ...checkSemanticAlias(semantic[colorScheme]),
      ...checkSemanticColor(semantic[colorScheme]),
      ...checkPathStructure({
        tokenFile: semantic[colorScheme],
        minDepth: 1,
        maxDepth: 2,
        shape: "(그룹)/이름",
      }),
      ...checkKebabCase(semantic[colorScheme]),
      ...checkValueFormat(semantic[colorScheme]),
      ...checkReferenceExists({
        tokenFile: semantic[colorScheme],
        targets: new Set(
          [...primitive.tokens, ...semantic[colorScheme].tokens].map((token) =>
            getTokenPath(token),
          ),
        ),
      }),
      ...checkReferenceNoCycle(semantic[colorScheme]),
      // Color Scheme마다 Primitive와 함께 한 CSS 파일에 나오므로 Primitive 이름과도 겹치면 안 된다
      ...checkCssNameUnique({
        tokenFile: semantic[colorScheme],
        taken: getCssNames(primitive),
      }),
    ]),
    ...checkSemanticNamesMatch(semantic),
  ];
  if (violations.length === 0) return;

  // 파일 순서(Primitive, light, dark)로 묶어 알린다. 같은 파일 안에서는 규칙을 검사한 순서를 지킨다
  const fileOrder = [primitive, ...COLOR_SCHEMES.map((c) => semantic[c])].map(
    ({ file }) => file,
  );
  throw new TokenValidationError(
    violations.toSorted(
      (a, b) => fileOrder.indexOf(a.file) - fileOrder.indexOf(b.file),
    ),
  );
}
