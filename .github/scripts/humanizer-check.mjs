import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import fs from "fs";
import path from "path";
import { z } from "zod";

function extractContent(mdxContent) {
  const frontmatterMatch = mdxContent.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    return mdxContent.slice(frontmatterMatch[0].length);
  }
  return mdxContent;
}

function extractFrontmatter(mdxContent) {
  const frontmatterMatch = mdxContent.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    return frontmatterMatch[1];
  }
  return "";
}

function getFrontmatterLineCount(mdxContent) {
  const frontmatterMatch = mdxContent.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    return frontmatterMatch[0].split("\n").length - 1;
  }
  return 0;
}

const issueSchema = z.object({
  issues: z.array(
    z.object({
      line: z.number().describe("Line number in the content (1-indexed)"),
      original: z
        .string()
        .describe("The exact original text that triggers the flag"),
      suggestion: z
        .string()
        .describe("Rewritten text that sounds natural and human-written"),
      reason: z
        .string()
        .describe(
          "Which humanizer pattern this matches (by number) and why it reads as AI output",
        ),
      category: z.enum([
        "significance-inflation",
        "notability-namedropping",
        "superficial-ing-analysis",
        "promotional-language",
        "vague-attribution",
        "formulaic-challenges",
        "ai-vocabulary",
        "copula-avoidance",
        "negative-parallelism",
        "rule-of-three",
        "synonym-cycling",
        "false-range",
        "em-dash-overuse",
        "boldface-overuse",
        "inline-header-list",
        "title-case-heading",
        "emoji-decoration",
        "curly-quotes",
        "chatbot-artifact",
        "cutoff-disclaimer",
        "sycophantic-tone",
        "filler-phrase",
        "excessive-hedging",
        "generic-conclusion",
        "soulless-writing",
        "other",
      ]),
      severity: z
        .enum(["high", "medium", "low"])
        .describe(
          "high = obvious AI tell, medium = likely AI pattern, low = subtle but suspicious",
        ),
    }),
  ),
  score: z.object({
    naturalness: z
      .number()
      .describe(
        "Score from 1 to 10: Does it sound like a real person wrote this?",
      ),
    specificity: z
      .number()
      .describe("Score from 1 to 10: Specific details vs vague claims?"),
    voice: z
      .number()
      .describe("Score from 1 to 10: Does it have personality and opinions?"),
    rhythm: z
      .number()
      .describe("Score from 1 to 10: Varied sentence structure or metronomic?"),
    conciseness: z
      .number()
      .describe("Score from 1 to 10: Tight writing or padded with filler?"),
  }),
  summary: z
    .string()
    .describe(
      "Overall assessment: how human does this sound, and what are the dominant AI patterns?",
    ),
});

const SYSTEM_PROMPT = `You are a writing editor that identifies and removes signs of AI-generated text, based on the "humanizer" guide (derived from Wikipedia's "Signs of AI writing" page maintained by WikiProject AI Cleanup).

Your job is to scan blog posts and flag every pattern that would cause a reader to think "this was written by an AI". Be thorough and aggressive.

Key insight: "LLMs use statistical algorithms to guess what should come next. The result tends toward the most statistically likely result that applies to the widest variety of cases."

# THE 24 PATTERNS TO DETECT

## CONTENT PATTERNS

### 1. Significance Inflation
Words to watch: stands/serves as, is a testament/reminder, a vital/significant/crucial/pivotal/key role/moment, underscores/highlights its importance/significance, reflects broader, symbolizing its ongoing/enduring/lasting, contributing to the, setting the stage for, marking/shaping the, represents/marks a shift, key turning point, evolving landscape, focal point, indelible mark, deeply rooted
Problem: LLM writing puffs up importance by adding statements about how arbitrary aspects represent or contribute to a broader topic.

### 2. Notability Name-dropping
Words to watch: independent coverage, local/regional/national media outlets, written by a leading expert, active social media presence
Problem: LLMs list sources without context to hammer home notability.

### 3. Superficial -ing Analyses
Words to watch: highlighting/underscoring/emphasizing..., ensuring..., reflecting/symbolizing..., contributing to..., cultivating/fostering..., encompassing..., showcasing...
Problem: AI tacks present participle phrases onto sentences to add fake depth.

### 4. Promotional Language
Words to watch: boasts a, vibrant, rich (figurative), profound, enhancing its, showcasing, exemplifies, commitment to, natural beauty, nestled, in the heart of, groundbreaking (figurative), renowned, breathtaking, must-visit, stunning
Problem: LLMs struggle to keep a neutral tone.

### 5. Vague Attributions
Words to watch: Industry reports, Observers have cited, Experts argue, Some critics argue, several sources/publications (when few cited)
Problem: AI attributes opinions to vague authorities without specific sources.

### 6. Formulaic Challenges
Words to watch: Despite its... faces several challenges..., Despite these challenges, Challenges and Legacy, Future Outlook
Problem: LLM-generated articles include formulaic "Challenges" sections.

## LANGUAGE AND GRAMMAR PATTERNS

### 7. AI Vocabulary
High-frequency AI words: Additionally, align with, crucial, delve, emphasizing, enduring, enhance, fostering, garner, highlight (verb), interplay, intricate/intricacies, key (adjective), landscape (abstract noun), pivotal, showcase, tapestry (abstract noun), testament, underscore (verb), valuable, vibrant
Problem: These words appear far more frequently in post-2023 AI text and often co-occur.

### 8. Copula Avoidance
Words to watch: serves as/stands as/marks/represents [a], boasts/features/offers [a]
Problem: LLMs substitute elaborate constructions for simple "is"/"are"/"has".

### 9. Negative Parallelisms
Problem: Constructions like "Not only...but..." or "It's not just about..., it's..." are overused by AI.

### 10. Rule of Three
Problem: LLMs force ideas into groups of three to appear comprehensive.

### 11. Synonym Cycling
Problem: AI has repetition-penalty code causing excessive synonym substitution instead of natural repetition.

### 12. False Ranges
Problem: LLMs use "from X to Y" constructions where X and Y aren't on a meaningful scale.

## STYLE PATTERNS

### 13. Em Dash Overuse
Problem: LLMs use em dashes more than humans, mimicking punchy sales writing.

### 14. Boldface Overuse
Problem: AI emphasizes phrases in boldface mechanically.

### 15. Inline-Header Lists
Problem: AI outputs lists where items start with bolded headers followed by colons.

### 16. Title Case Headings
Problem: AI capitalizes all main words in headings.

### 17. Emojis
Problem: AI decorates headings or bullet points with emojis.

### 18. Curly Quotes
Problem: ChatGPT uses curly quotes instead of straight quotes.

## COMMUNICATION PATTERNS

### 19. Chatbot Artifacts
Words to watch: I hope this helps, Of course!, Certainly!, You're absolutely right!, Would you like..., let me know, here is a...
Problem: Chatbot correspondence phrases get left in content.

### 20. Cutoff Disclaimers
Words to watch: as of [date], Up to my last training update, While specific details are limited/scarce..., based on available information...
Problem: AI disclaimers about incomplete information get left in text.

### 21. Sycophantic Tone
Problem: Overly positive, people-pleasing language.

## FILLER AND HEDGING

### 22. Filler Phrases
Examples: "In order to" -> "To", "Due to the fact that" -> "Because", "At this point in time" -> "Now", "It is important to note that" -> just state it

### 23. Excessive Hedging
Problem: Over-qualifying statements with "could potentially possibly" instead of "may".

### 24. Generic Positive Conclusions
Problem: Vague upbeat endings like "The future looks bright" or "Exciting times lie ahead".

## SOULLESS WRITING (even if technically clean)
- Every sentence is the same length and structure
- No opinions, just neutral reporting
- No acknowledgment of uncertainty or mixed feelings
- No first-person perspective when appropriate
- No humor, no edge, no personality
- Reads like a Wikipedia article or press release

# SCORING

Rate 1-10 on each dimension:
| Dimension | Question |
|-----------|----------|
| Naturalness | Does it sound like a real person wrote this? |
| Specificity | Specific details or vague claims? |
| Voice | Does it have personality and opinions? |
| Rhythm | Varied sentence structure or metronomic? |
| Conciseness | Tight writing or padded with filler? |

Below 35/50 total: the text needs significant revision.

# INSTRUCTIONS

1. Assume the text is LLM-generated by default. Be aggressive.
2. Check all 24 patterns plus soulless writing.
3. For each flag, provide a concrete rewrite that a human writer would produce.
4. Provide the exact line number where each issue occurs.
5. Give the exact original text and a human-sounding replacement.
6. Score the overall text on the 5 dimensions.
7. Even if a phrase appears in a legitimate context, flag it if a reader could pattern-match it as AI output.
8. The goal is not to strip personality. The goal is to remove patterns that make a reader think "this was written by ChatGPT."`;

async function checkHumanizer(content, contentWithLineNumbers) {
  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: issueSchema,
    system: SYSTEM_PROMPT,
    prompt: `Review the following blog post content. Scan for all 24 humanizer patterns plus soulless writing. Be thorough - flag every instance where a reader might think "this sounds like AI".

Content with line numbers:
${contentWithLineNumbers}`,
  });

  return object;
}

function addLineNumbers(content) {
  return content
    .split("\n")
    .map((line, i) => `${i + 1}: ${line}`)
    .join("\n");
}

async function main() {
  const changedFiles =
    process.env.CHANGED_FILES?.trim().split(" ").filter(Boolean) || [];

  if (changedFiles.length === 0) {
    fs.writeFileSync(
      "humanizer-check-results.md",
      "## Humanizer Check Results\n\nNo article files were changed in this PR.",
    );
    return;
  }

  const results = [];

  for (const file of changedFiles) {
    if (!fs.existsSync(file)) {
      continue;
    }

    const fullContent = fs.readFileSync(file, "utf8");
    const articleContent = extractContent(fullContent);
    const frontmatter = extractFrontmatter(fullContent);
    const frontmatterLines = getFrontmatterLineCount(fullContent);

    const titleMatch =
      frontmatter.match(/display_title:\s*["']?(.+?)["']?\s*$/m) ||
      frontmatter.match(/meta_title:\s*["']?(.+?)["']?\s*$/m);
    const title = titleMatch ? titleMatch[1] : path.basename(file, ".mdx");

    console.log(`Humanizer-checking: ${file}`);

    try {
      const contentWithLineNumbers = addLineNumbers(articleContent);
      const feedback = await checkHumanizer(
        articleContent,
        contentWithLineNumbers,
      );

      const totalScore =
        feedback.score.naturalness +
        feedback.score.specificity +
        feedback.score.voice +
        feedback.score.rhythm +
        feedback.score.conciseness;

      results.push({
        file,
        title,
        feedback,
        frontmatterLines,
        totalScore,
        contentLines: articleContent.split("\n"),
      });
    } catch (error) {
      results.push({
        file,
        title,
        feedback: null,
        error: error.message,
      });
    }
  }

  let markdown = "## Humanizer Check Results\n\n";
  markdown += `Reviewed ${results.length} article${results.length === 1 ? "" : "s"} for AI writing patterns (based on [blader/humanizer](https://github.com/blader/humanizer)).\n\n`;

  for (const result of results) {
    markdown += `### ${result.title}\n`;
    markdown += `\`${result.file}\`\n\n`;

    if (result.error) {
      markdown += `Error: ${result.error}\n\n`;
    } else {
      const { feedback, totalScore } = result;
      const passIcon = totalScore >= 35 ? "PASS" : "NEEDS REVISION";

      markdown += `**Score: ${totalScore}/50** (${passIcon})\n\n`;
      markdown += `| Dimension | Score |\n|-----------|-------|\n`;
      markdown += `| Naturalness | ${feedback.score.naturalness}/10 |\n`;
      markdown += `| Specificity | ${feedback.score.specificity}/10 |\n`;
      markdown += `| Voice | ${feedback.score.voice}/10 |\n`;
      markdown += `| Rhythm | ${feedback.score.rhythm}/10 |\n`;
      markdown += `| Conciseness | ${feedback.score.conciseness}/10 |\n\n`;

      markdown += `${feedback.summary}\n\n`;

      if (feedback.issues.length === 0) {
        markdown += `No AI writing patterns detected.\n\n`;
      } else {
        const highCount = feedback.issues.filter(
          (i) => i.severity === "high",
        ).length;
        const medCount = feedback.issues.filter(
          (i) => i.severity === "medium",
        ).length;
        const lowCount = feedback.issues.filter(
          (i) => i.severity === "low",
        ).length;

        markdown += `Found **${feedback.issues.length}** issue${feedback.issues.length === 1 ? "" : "s"}`;
        markdown += ` (${highCount} high, ${medCount} medium, ${lowCount} low)\n\n`;

        const severityOrder = ["high", "medium", "low"];
        const severityLabels = {
          high: "HIGH - Obvious AI Tell",
          medium: "MEDIUM - Likely AI Pattern",
          low: "LOW - Subtle but Suspicious",
        };

        for (const severity of severityOrder) {
          const issues = feedback.issues.filter((i) => i.severity === severity);
          if (issues.length === 0) continue;

          markdown += `#### ${severityLabels[severity]}\n\n`;

          for (const issue of issues) {
            const actualLine = issue.line + result.frontmatterLines;
            markdown += `**Line ${actualLine}** - \`${issue.category}\`\n`;
            markdown += `> ${issue.original}\n\n`;
            markdown += `${issue.reason}\n\n`;
            markdown += `<details>\n<summary>Suggested rewrite</summary>\n\n`;
            markdown += `\`\`\`suggestion\n${issue.suggestion}\n\`\`\`\n\n`;
            markdown += `</details>\n\n`;
          }
        }
      }
    }

    markdown += "---\n\n";
  }

  markdown +=
    "\n*Powered by Claude Haiku 4.5 with [humanizer](https://github.com/blader/humanizer) patterns*";

  fs.writeFileSync("humanizer-check-results.md", markdown);
  console.log(
    "Humanizer check complete. Results written to humanizer-check-results.md",
  );
}

main().catch((error) => {
  console.error("Humanizer check failed:", error);
  fs.writeFileSync(
    "humanizer-check-results.md",
    `## Humanizer Check Results\n\nHumanizer check failed: ${error.message}`,
  );
  process.exit(1);
});
