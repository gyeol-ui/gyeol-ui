// 토큰 JSON이 spec #16의 "검증 규칙"을 지키는지 검사한다. 위반은 첫 번째에서 멈추지 않고 모두 모은다.
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import {
  COLOR_SCHEMES,
  resolveTokenFilePaths,
  type ColorScheme,
} from "./build-tokens.helper.ts";
import {
  checkCssNameUnique,
  checkKebabCase,
  checkPathStructure,
  checkPrimitiveRealValue,
  checkReferenceExists,
  checkReferenceNoCycle,
  checkSemanticAlias,
  checkSemanticColor,
  checkSemanticNamesMatch,
  checkSemanticRole,
  checkValueFormat,
  collectTokens,
  indexCssNames,
  isObject,
  joinTokenPath,
  type TokenFile,
  type Violation,
} from "./validate-tokens.helper.ts";

export type { RuleName, Violation } from "./validate-tokens.helper.ts";

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

/** 토큰 파일 하나를 읽어 토큰 목록으로 펼친다. 파일이 없으면 ENOENT로, JSON이 아니면 파일 이름을 담은 오류로 실패한다 */
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

/**
 * 토큰 폴더의 토큰 파일을 읽어 검증 규칙을 모두 검사한다. 위반이 하나라도 있으면 모두 담아 TokenValidationError를 던진다.
 * 파일이 없거나 JSON이 아니면 규칙 위반이 아니라 일반 오류로 실패한다.
 */
export async function validateTokens(tokensDir: string): Promise<void> {
  const paths = resolveTokenFilePaths(tokensDir);
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
      ...checkSemanticRole(semantic[colorScheme]),
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
          [...primitive.tokens, ...semantic[colorScheme].tokens].map(
            joinTokenPath,
          ),
        ),
      }),
      ...checkReferenceNoCycle(semantic[colorScheme]),
      // Color Scheme마다 Primitive와 함께 한 CSS 파일에 나오므로 Primitive 이름과도 겹치면 안 된다
      ...checkCssNameUnique({
        tokenFile: semantic[colorScheme],
        taken: indexCssNames(primitive),
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
