import type {
  AttributeCheck,
  Check,
  CheckResult,
  CssCheck,
  ExistsCheck,
  TestCheck,
  TextCheck,
} from './types.js';

/** How long a `test` check may run before it counts as failed. */
export const TEST_TIMEOUT_MS = 2000;

/** Runs a test's code in the page and returns its result. */
export type TestRunner = (code: string) => Promise<unknown>;

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

function select(doc: Document, selector: string): Element[] {
  try {
    return [...doc.querySelectorAll(selector)];
  } catch {
    // An invalid selector is an authoring mistake; content-import reports it.
    return [];
  }
}

function matches<T>(elements: T[], all: boolean | undefined, test: (element: T) => boolean) {
  if (elements.length === 0) return false;
  return all ? elements.every(test) : elements.some(test);
}

function checkExists(doc: Document, check: ExistsCheck): boolean {
  const count = select(doc, check.selector).length;
  return count >= (check.min ?? 1) && (check.max === undefined || count <= check.max);
}

function checkText(doc: Document, check: TextCheck): boolean {
  return matches(select(doc, check.selector), check.all, (element) => {
    const text = normalize(element.textContent ?? '');
    if (check.notEmpty && !text) return false;
    if (check.includes !== undefined && !text.includes(normalize(check.includes))) return false;
    if (check.equals !== undefined && text !== normalize(check.equals)) return false;
    return true;
  });
}

function checkAttribute(doc: Document, check: AttributeCheck): boolean {
  return matches(select(doc, check.selector), check.all, (element) => {
    const value = element.getAttribute(check.name);
    if (value === null) return false;
    if (check.notEmpty && !value.trim()) return false;
    if (check.includes !== undefined && !normalize(value).includes(normalize(check.includes))) {
      return false;
    }
    return true;
  });
}

/** "h1,  .card" → ["h1", ".card"] */
const selectorList = (selectorText: string) =>
  selectorText.split(',').map((part) => normalize(part).replace(/\s*([>+~])\s*/g, '$1'));

interface StyleRuleLike {
  selectorText?: string;
  style?: CSSStyleDeclaration;
  cssRules?: CSSRuleList;
}

function* styleRules(rules: CSSRuleList | undefined): Generator<StyleRuleLike> {
  if (!rules) return;
  for (const rule of [...rules] as StyleRuleLike[]) {
    if (rule.selectorText !== undefined && rule.style) yield rule;
    // @media and other grouping rules hold their own rules.
    if (rule.cssRules) yield* styleRules(rule.cssRules);
  }
}

/** The value a rule sets for a property, including one set through a shorthand. */
function declaredValue(style: CSSStyleDeclaration, property: string): string {
  const direct = style.getPropertyValue(property);
  if (direct.trim()) return direct;
  // Some engines don't expand shorthands; fall back to the declaration text.
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i').exec(style.cssText ?? '');
  return match?.[1] ?? '';
}

function checkCss(doc: Document, check: CssCheck): boolean {
  const wanted = selectorList(check.selector)[0] ?? '';
  const properties = check.property.split('|').map((p) => p.trim().toLowerCase());
  for (const sheet of Array.from(doc.styleSheets)) {
    let rules: CSSRuleList | undefined;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of styleRules(rules)) {
      if (!rule.style || !selectorList(rule.selectorText ?? '').includes(wanted)) continue;
      for (const property of properties) {
        const value = declaredValue(rule.style, property);
        if (!value.trim()) continue;
        if (check.includes !== undefined && !normalize(value).includes(normalize(check.includes))) {
          continue;
        }
        return true;
      }
    }
  }
  return false;
}

async function checkTest(check: TestCheck, runTest: TestRunner): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), TEST_TIMEOUT_MS);
  });
  try {
    const outcome = await Promise.race([runTest(check.code).then(Boolean), timeout]);
    return outcome;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Runs `code` as the body of an async function in the page's own window. */
export function windowTestRunner(win: Window): TestRunner {
  return (code: string) => {
    const PageFunction = (win as unknown as { Function: FunctionConstructor }).Function;
    const run = new PageFunction(`return (async () => {\n${code}\n})();`) as () => Promise<unknown>;
    return run();
  };
}

/** Runs every check against the page. Never throws: a broken check simply fails. */
export async function evaluateChecks(
  doc: Document,
  checks: Check[],
  runTest?: TestRunner,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const check of checks) {
    let passed = false;
    try {
      switch (check.expect) {
        case 'exists':
          passed = checkExists(doc, check);
          break;
        case 'text':
          passed = checkText(doc, check);
          break;
        case 'attribute':
          passed = checkAttribute(doc, check);
          break;
        case 'css':
          passed = checkCss(doc, check);
          break;
        case 'test':
          passed = runTest ? await checkTest(check, runTest) : false;
          break;
        case 'output':
        case 'python':
        case 'stage':
        case 'blocks':
        case 'git':
          // Python programs are checked with runPythonChecks (python.ts), block
          // programs with evaluateStageChecks (stage/checks.ts) and git lessons with
          // evaluateGitChecks (git/checks.ts), not as pages.
          passed = false;
          break;
      }
    } catch {
      passed = false;
    }
    results.push({ id: check.id, passed, ...(check.hint ? { hint: check.hint } : {}) });
  }
  return results;
}

export const allPassed = (results: CheckResult[]) =>
  results.length > 0 && results.every((result) => result.passed);
