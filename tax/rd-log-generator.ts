import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

interface RDExperimentRecord {
  experiment: string;
  uncertainty: string;
  approach: string;
  outcome: string;
  iteration: string;
}

interface RDProjectRecord {
  project: string;
  objective: string;
  technicalUncertainties: string[];
  experiments: RDExperimentRecord[];
}

export interface RDLogGeneratorInput {
  memberId: string;
  name: string;
  businessType: string;
  hasPrototypes: boolean;
  chatHistorySummary: string;
  country: string;
  state: string;
}

export interface RDLogGeneratorResult {
  markdownPath: string;
  jsonPath: string;
  generatedAt: string;
}

export function generateRDLog(input: RDLogGeneratorInput): RDLogGeneratorResult {
  const generatedAt = new Date().toISOString();
  const markdownPath = normalizePath(path.join("docs", "tax", "rd-logs", `${input.memberId}.md`));
  const jsonPath = normalizePath(path.join("data", "tax", "rd-logs", `${input.memberId}.json`));

  const projects = buildProjects(input);
  const document = {
    schema: "wealthbridge.rd-log.v1",
    generatedAt,
    memberId: input.memberId,
    contributor: input.name,
    businessType: input.businessType,
    jurisdiction: {
      country: input.country,
      state: input.state
    },
    sourceSummary: input.chatHistorySummary,
    projects
  };

  writeFile(jsonPath, JSON.stringify(document, null, 2));
  writeFile(markdownPath, toMarkdown(document));

  return {
    markdownPath,
    jsonPath,
    generatedAt
  };
}

function buildProjects(input: RDLogGeneratorInput): RDProjectRecord[] {
  const prototypeTrack = input.hasPrototypes
    ? {
        project: `${input.businessType} Prototype Validation`,
        objective: "Validate feasibility of prototype outputs under production-like constraints.",
        technicalUncertainties: [
          "Whether current architecture meets reliability targets under load.",
          "Whether model/configuration choices can preserve quality and latency simultaneously."
        ],
        experiments: [
          {
            experiment: "Prototype stress and failure-mode test",
            uncertainty: "Operational tolerance at higher throughput.",
            approach: "Replay representative scenarios from historical AI assistant usage summaries.",
            outcome: "Identified failure patterns and response thresholds.",
            iteration: "Introduced iterative tuning with revised thresholds and reran tests."
          }
        ]
      }
    : {
        project: `${input.businessType} Discovery and Experiment Planning`,
        objective: "Define technically feasible R&D tracks before full prototype implementation.",
        technicalUncertainties: [
          "What implementation path can satisfy objective constraints.",
          "What knowledge gaps require iterative experimentation."
        ],
        experiments: [
          {
            experiment: "Feasibility decomposition sprint",
            uncertainty: "Best architecture for first controlled prototype.",
            approach: "Mapped alternatives from chat-history-assisted ideation and decision logs.",
            outcome: "Prioritized one architecture and deferred others.",
            iteration: "Prepared next-cycle experiment backlog and evaluation rubric."
          }
        ]
      };

  return [
    {
      project: "AI-Assisted R&D Workflow Reconstruction",
      objective: "Reconstruct the technical R&D narrative from prior ChatGPT/Claude activity summaries.",
      technicalUncertainties: [
        "Which uncertain technical hypotheses were tested across iterations.",
        "How documented outcomes map to credit-eligible experimentation work."
      ],
      experiments: [
        {
          experiment: "Prompt and response sequence extraction (placeholder ingestion)",
          uncertainty: "Completeness of historic work trace from summarized transcript artifacts.",
          approach: "Ingested summarized interaction history and mapped content to experiment records.",
          outcome: "Generated draft chronology of uncertainty -> experiment -> result.",
          iteration: "Flagged sections requiring supporting source artifacts in future ingestion phase."
        }
      ]
    },
    prototypeTrack
  ];
}

function toMarkdown(document: {
  generatedAt: string;
  memberId: string;
  contributor: string;
  businessType: string;
  jurisdiction: { country: string; state: string };
  sourceSummary: string;
  projects: RDProjectRecord[];
}): string {
  const sections: string[] = [];
  sections.push(`# R&D Activity Log - ${document.memberId}`);
  sections.push("");
  sections.push(`- Generated: ${document.generatedAt}`);
  sections.push(`- Contributor: ${document.contributor}`);
  sections.push(`- Business Type: ${document.businessType}`);
  sections.push(`- Jurisdiction: ${document.jurisdiction.state}, ${document.jurisdiction.country}`);
  sections.push("");
  sections.push("## Chat History Summary (Placeholder Ingestion)");
  sections.push(document.sourceSummary || "No chat history summary provided.");
  sections.push("");
  sections.push("## Projects");
  sections.push("");

  for (const project of document.projects) {
    sections.push(`### ${project.project}`);
    sections.push(`Objective: ${project.objective}`);
    sections.push("");
    sections.push("Technical Uncertainties:");
    for (const uncertainty of project.technicalUncertainties) {
      sections.push(`- ${uncertainty}`);
    }
    sections.push("");
    sections.push("Experiments and Iterations:");
    for (const experiment of project.experiments) {
      sections.push(`- Experiment: ${experiment.experiment}`);
      sections.push(`- Uncertainty: ${experiment.uncertainty}`);
      sections.push(`- Approach: ${experiment.approach}`);
      sections.push(`- Outcome: ${experiment.outcome}`);
      sections.push(`- Iteration: ${experiment.iteration}`);
      sections.push("");
    }
  }

  return sections.join("\n");
}

function writeFile(relativePath: string, contents: string): void {
  const absolutePath = path.resolve(REPO_ROOT, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, "utf8");
}

function normalizePath(input: string): string {
  return input.replace(/\\/g, "/");
}
