// 헬퍼의 입력과 출력을 보여 주는 문서용 테스트다. 기대값은 손으로 쓴 결과 그대로다.
// 빌드가 실제로 규칙을 어긴 토큰 폴더에서 실패하는지는 build-tokens.test.ts가 확인한다.
import { describe, expect, it } from "vitest";
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
  checkValueFormat,
  collectTokens,
  indexCssNames,
  type Token,
} from "./validate-tokens.helper.ts";

const WHITE = { colorSpace: "srgb", components: [1, 1, 1] };

/** `"color.gray.900"` 같은 경로와 값으로 Token을 만든다. `type`을 생략하면 color다 */
const toToken = ({
  path,
  value,
  type = "color",
  extensions,
}: {
  path: string;
  value: unknown;
  type?: unknown;
  extensions?: unknown;
}): Token => ({ path: path.split("."), type, value, extensions });

// 토큰 JSON을 토큰 목록으로 펼친다
describe("collectTokens", () => {
  it("$value가 있는 객체만 토큰으로 모으고, 그룹의 $type을 물려준다", () => {
    // given, when
    const tokens = collectTokens({
      group: {
        color: {
          $type: "color",
          white: { $value: WHITE },
          gray: { "900": { $value: "{color.black}" } },
        },
        radius: {
          md: { $type: "dimension", $value: { value: 6, unit: "px" } },
        },
      },
      path: [],
      inheritedType: undefined,
    });

    // then
    expect(tokens).toEqual([
      {
        path: ["color", "white"],
        type: "color",
        value: WHITE,
        extensions: undefined,
      },
      {
        path: ["color", "gray", "900"],
        type: "color",
        value: "{color.black}",
        extensions: undefined,
      },
      {
        path: ["radius", "md"],
        type: "dimension",
        value: { value: 6, unit: "px" },
        extensions: undefined,
      },
    ]);
  });
});

// primitive-real-value
describe("checkPrimitiveRealValue", () => {
  it("참조와 alias + 투명도 확장을 알리고, 색 값 자체의 alpha는 통과시킨다", () => {
    // given, when
    const violations = checkPrimitiveRealValue({
      file: "primitive.json",
      tokens: [
        toToken({ path: "color.ink", value: "{color.black}" }),
        toToken({
          path: "color.shade",
          value: { ...WHITE, alpha: 0.5 },
          extensions: {
            gyeol: { alias: { ref: "{color.white}", alpha: 0.5 } },
          },
        }),
        toToken({ path: "color.overlay", value: { ...WHITE, alpha: 0.5 } }),
      ],
    });

    // then
    expect(violations).toEqual([
      {
        file: "primitive.json",
        path: "color.ink",
        rule: "primitive-real-value",
        detail: "Primitive는 실제 값만 둔다. alias {color.black}를 쓸 수 없다",
      },
      {
        file: "primitive.json",
        path: "color.shade",
        rule: "primitive-real-value",
        detail:
          "Primitive는 실제 값만 둔다. alias + 투명도($extensions.gyeol.alias)를 쓸 수 없다",
      },
    ]);
  });
});

// semantic-alias
describe("checkSemanticAlias", () => {
  it("참조도 alias + 투명도도 아닌 값과, ref가 참조가 아닌 확장을 알린다", () => {
    // given, when
    const violations = checkSemanticAlias({
      file: "semantic/light.json",
      tokens: [
        toToken({ path: "bg-surface", value: "{color.white}" }),
        toToken({
          path: "alpha.90",
          value: { ...WHITE, alpha: 0.9 },
          extensions: { gyeol: { alias: { ref: "{bg-surface}", alpha: 0.9 } } },
        }),
        toToken({ path: "fg-default", value: WHITE }),
        toToken({
          path: "scrim",
          value: { ...WHITE, alpha: 0.5 },
          extensions: { gyeol: { alias: { ref: "bg-surface", alpha: 0.5 } } },
        }),
      ],
    });

    // then
    expect(violations).toEqual([
      {
        file: "semantic/light.json",
        path: "fg-default",
        rule: "semantic-alias",
        detail:
          'Semantic은 Primitive나 다른 Semantic을 가리키는 alias(예: "{color.gray.900}")여야 한다',
      },
      {
        file: "semantic/light.json",
        path: "scrim",
        rule: "semantic-alias",
        detail:
          '$extensions.gyeol.alias의 ref가 참조 문자열(예: "{bg-surface}")이 아니다',
      },
    ]);
  });
});

// semantic-color
describe("checkSemanticColor", () => {
  it("$type이 color가 아니거나 없는 토큰을 알린다", () => {
    // given, when
    const violations = checkSemanticColor({
      file: "semantic/light.json",
      tokens: [
        toToken({ path: "bg-surface", value: "{color.white}" }),
        toToken({ path: "gap", value: "{spacing.4}", type: "dimension" }),
        // toToken은 type을 생략하면 color로 채우므로 직접 쓴다
        {
          path: ["ring"],
          type: undefined,
          value: "{color.white}",
          extensions: undefined,
        },
      ],
    });

    // then
    expect(violations).toEqual([
      {
        file: "semantic/light.json",
        path: "gap",
        rule: "semantic-color",
        detail: 'Semantic의 $type은 color여야 한다. 지금은 "dimension"이다',
      },
      {
        file: "semantic/light.json",
        path: "ring",
        rule: "semantic-color",
        detail: "Semantic의 $type은 color여야 한다. 지금은 없음이다",
      },
    ]);
  });
});

// semantic-names-match
describe("checkSemanticNamesMatch", () => {
  it("다른 Color Scheme 파일에만 있는 토큰을 빠진 쪽 파일의 위반으로 알린다", () => {
    // given, when
    const violations = checkSemanticNamesMatch({
      light: {
        file: "semantic/light.json",
        tokens: [
          toToken({ path: "bg-surface", value: "{color.white}" }),
          toToken({ path: "fg-default", value: "{color.black}" }),
        ],
      },
      dark: {
        file: "semantic/dark.json",
        tokens: [toToken({ path: "bg-surface", value: "{color.black}" })],
      },
    });

    // then
    expect(violations).toEqual([
      {
        file: "semantic/dark.json",
        path: "fg-default",
        rule: "semantic-names-match",
        detail: "semantic/light.json에 있는 Semantic이 이 파일에 없다",
      },
    ]);
  });
});

// path-structure
describe("checkPathStructure", () => {
  it("단계 수가 minDepth–maxDepth 밖인 경로를 알린다", () => {
    // given, when: Semantic은 (그룹)/이름, 1–2단계
    const violations = checkPathStructure({
      tokenFile: {
        file: "semantic/light.json",
        tokens: [
          toToken({ path: "bg-surface", value: "{color.white}" }),
          toToken({ path: "alpha.90", value: "{color.white}" }),
          toToken({ path: "alpha.surface.90", value: "{color.white}" }),
        ],
      },
      minDepth: 1,
      maxDepth: 2,
      shape: "(그룹)/이름",
    });

    // then
    expect(violations).toEqual([
      {
        file: "semantic/light.json",
        path: "alpha.surface.90",
        rule: "path-structure",
        detail: "경로는 (그룹)/이름(1–2단계)여야 한다. 지금은 3단계다",
      },
    ]);
  });
});

// kebab-case
describe("checkKebabCase", () => {
  it("kebab-case가 아닌 이름 칸을 모두 적어 알린다", () => {
    // given, when
    const violations = checkKebabCase({
      file: "primitive.json",
      tokens: [
        toToken({ path: "color.gray.900", value: WHITE }),
        toToken({ path: "Color.dark_gray", value: WHITE }),
      ],
    });

    // then
    expect(violations).toEqual([
      {
        file: "primitive.json",
        path: "Color.dark_gray",
        rule: "kebab-case",
        detail:
          "경로의 이름 칸은 kebab-case(소문자, 숫자, -)여야 한다: Color, dark_gray",
      },
    ]);
  });
});

// color-srgb, dimension-px
describe("checkValueFormat", () => {
  it("srgb 색 객체가 아닌 색과 unit이 px가 아닌 dimension을 알리고, 참조는 건너뛴다", () => {
    // given, when
    const violations = checkValueFormat({
      file: "primitive.json",
      tokens: [
        toToken({ path: "color.white", value: WHITE }),
        toToken({ path: "color.green", value: "#00ff00" }),
        toToken({ path: "color.ink", value: "{color.black}" }),
        toToken({
          path: "radius.md",
          value: { value: 0.375, unit: "rem" },
          type: "dimension",
        }),
      ],
    });

    // then
    expect(violations).toEqual([
      {
        file: "primitive.json",
        path: "color.green",
        rule: "color-srgb",
        detail:
          '색은 srgb 색 객체({ "colorSpace": "srgb", "components": [r, g, b] })여야 한다. 지금은 "#00ff00"이다',
      },
      {
        file: "primitive.json",
        path: "radius.md",
        rule: "dimension-px",
        detail:
          'dimension은 { "value": 숫자, "unit": "px" }여야 한다. 지금은 {"value":0.375,"unit":"rem"}이다',
      },
    ]);
  });
});

// reference-exists
describe("checkReferenceExists", () => {
  it("$value와 alias + 투명도의 참조 중 targets에 없는 것을 알린다", () => {
    // given, when
    const violations = checkReferenceExists({
      tokenFile: {
        file: "semantic/light.json",
        tokens: [
          toToken({ path: "bg-surface", value: "{color.white}" }),
          toToken({ path: "fg-default", value: "{color.gray.500}" }),
          toToken({
            path: "alpha.90",
            value: { ...WHITE, alpha: 0.9 },
            extensions: {
              gyeol: { alias: { ref: "{bg-missing}", alpha: 0.9 } },
            },
          }),
        ],
      },
      targets: new Set(["color.white", "bg-surface", "fg-default", "alpha.90"]),
    });

    // then
    expect(violations).toEqual([
      {
        file: "semantic/light.json",
        path: "fg-default",
        rule: "reference-exists",
        detail: "참조 대상 토큰이 없다: {color.gray.500}",
      },
      {
        file: "semantic/light.json",
        path: "alpha.90",
        rule: "reference-exists",
        detail: "참조 대상 토큰이 없다: {bg-missing}",
      },
    ]);
  });
});

// reference-no-cycle
describe("checkReferenceNoCycle", () => {
  it("순환을 순환에 든 토큰 중 파일에서 가장 앞의 토큰에서 알린다", () => {
    // given, when: c → b → a → b. 순환은 a → b → a이고 a가 b보다 앞에 있다
    const violations = checkReferenceNoCycle({
      file: "semantic/light.json",
      tokens: [
        toToken({ path: "a", value: "{b}" }),
        toToken({ path: "b", value: "{a}" }),
        toToken({ path: "c", value: "{b}" }),
        toToken({ path: "d", value: "{color.white}" }),
      ],
    });

    // then
    expect(violations).toEqual([
      {
        file: "semantic/light.json",
        path: "a",
        rule: "reference-no-cycle",
        detail: "참조가 순환한다: a → b → a",
      },
    ]);
  });
});

// css-name-unique
describe("indexCssNames", () => {
  it("CSS 변수 이름(접두사 제외)을 그 토큰의 위치로 잇는다", () => {
    // given, when
    const names = indexCssNames({
      file: "primitive.json",
      tokens: [
        toToken({ path: "color.white", value: WHITE }),
        toToken({ path: "color.gray.900", value: WHITE }),
      ],
    });

    // then
    expect(names).toEqual(
      new Map([
        ["color-white", "primitive.json color.white"],
        ["color-gray-900", "primitive.json color.gray.900"],
      ]),
    );
  });
});

describe("checkCssNameUnique", () => {
  it("taken이나 같은 파일의 앞 토큰과 CSS 변수 이름이 겹치면 뒤의 토큰을 알린다", () => {
    // given, when
    const violations = checkCssNameUnique({
      tokenFile: {
        file: "semantic/light.json",
        tokens: [
          toToken({ path: "alpha.90", value: "{color.white}" }),
          toToken({ path: "alpha-90", value: "{color.white}" }),
          toToken({ path: "color-white", value: "{color.white}" }),
        ],
      },
      taken: new Map([["color-white", "primitive.json color.white"]]),
    });

    // then
    expect(violations).toEqual([
      {
        file: "semantic/light.json",
        path: "alpha-90",
        rule: "css-name-unique",
        detail:
          "CSS 변수 이름 --gyeol-alpha-90이 semantic/light.json alpha.90와 겹친다",
      },
      {
        file: "semantic/light.json",
        path: "color-white",
        rule: "css-name-unique",
        detail:
          "CSS 변수 이름 --gyeol-color-white이 primitive.json color.white와 겹친다",
      },
    ]);
  });
});
