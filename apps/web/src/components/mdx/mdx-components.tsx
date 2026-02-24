import { Columns, Info } from "lucide-react";
import type { ComponentType } from "react";

import { Accordion, Card, Note, Step, Steps, Tip } from "@hypr/ui/docs";

import { CtaCard } from "@/components/cta-card";
import { Image } from "@/components/image";

import { DeeplinksList } from "../deeplinks-list";
import { HooksList } from "../hooks-list";
import { OpenAPIDocs } from "../openapi-docs";
import { Callout } from "./callout";
import { CodeBlock } from "./code-block";
import { GithubEmbed } from "./github-embed";
import { MDXLink } from "./link";
import { Mermaid } from "./mermaid";
import { Tweet } from "./tweet";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto">
      <table {...props} className={`whitespace-nowrap ${className ?? ""}`}>
        {props.children}
      </table>
    </div>
  );
}

export type MDXComponents = {
  [key: string]: ComponentType<any>;
};

export const defaultMDXComponents: MDXComponents = {
  a: MDXLink,
  Accordion,
  Card,
  Callout,
  Columns,
  CtaCard,
  DeeplinksList,
  GithubEmbed,
  HooksList,
  Image,
  img: Image,
  Info,
  mermaid: Mermaid,
  Mermaid,
  Note,
  OpenAPIDocs,
  pre: CodeBlock,
  Step,
  Steps,
  table: Table,
  Tip,
  Tweet,
};

export function createMDXComponents(
  customComponents?: Partial<MDXComponents>,
): MDXComponents {
  return {
    ...defaultMDXComponents,
    ...(customComponents || {}),
  } as MDXComponents;
}
