#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { capture } from './lib/capture.js';
import { detectDomain } from './lib/url-builder.js';
import {
  CaptureConfigSchema,
  DOMAINS,
  LOCALES,
  VIEWPORTS,
  type CaptureConfig,
  type Domain,
} from './lib/types.js';

const ToolInputSchema = z.object({
  url: z.string().url(),
  locales: z.array(z.enum(LOCALES)).optional(),
  domains: z.array(z.enum(DOMAINS)).optional(),
  viewports: z.array(z.enum(VIEWPORTS)).optional(),
  output_dir: z.string().optional(),
  wait_selector: z.string().optional(),
  extra_delay_ms: z.number().int().nonnegative().optional(),
  slug: z.string().optional(),
  full_page: z.boolean().optional(),
  click_selectors: z.array(z.string()).optional(),
  dismiss_cookies: z.boolean().optional(),
});

type ToolInput = z.infer<typeof ToolInputSchema>;

function applyDefaults(args: ToolInput): CaptureConfig {
  const detected = detectDomain(args.url);
  const isLocal = detected === 'local';
  const config: CaptureConfig = {
    url: args.url,
    slug: args.slug,
    locales: args.locales ?? ['en', 'es', 'fr'],
    domains:
      args.domains ?? (isLocal ? ['local'] as Domain[] : [detected]),
    viewports: args.viewports ?? ['desktop', 'mobile'],
    outputDir: args.output_dir,
    waitSelector: args.wait_selector,
    extraDelayMs: args.extra_delay_ms ?? 1500,
    fullPage: args.full_page ?? true,
    clickSelectors: args.click_selectors,
    dismissCookies: args.dismiss_cookies,
  };
  return CaptureConfigSchema.parse(config);
}

const server = new Server(
  {
    name: 'screenshot-evidence',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'capture_screenshots',
      description:
        'Capture multi-locale, multi-viewport, multi-domain screenshots of a URL for MR/QA evidence. ' +
        'Saves PNGs and an index.md to a folder under <package>/output (or output_dir). ' +
        'For localhost URLs, locale is varied via path prefix only. ' +
        'For PartsTown production URLs, both domain (.com / .com.mx / .ca) and locale prefix can be varied.',
      inputSchema: {
        type: 'object',
        required: ['url'],
        properties: {
          url: {
            type: 'string',
            description: 'Base URL. Host determines local vs prod and the default domain.',
          },
          locales: {
            type: 'array',
            items: { type: 'string', enum: [...LOCALES] },
            description: 'Locales to capture. Defaults to [en, es, fr].',
          },
          domains: {
            type: 'array',
            items: { type: 'string', enum: [...DOMAINS] },
            description:
              'Domains to capture. Defaults to detected domain (or [local] for localhost).',
          },
          viewports: {
            type: 'array',
            items: { type: 'string', enum: [...VIEWPORTS] },
            description: 'Viewports. Defaults to [desktop, mobile].',
          },
          output_dir: {
            type: 'string',
            description: 'Custom output base directory.',
          },
          wait_selector: {
            type: 'string',
            description: 'Optional selector to wait for before capturing.',
          },
          extra_delay_ms: {
            type: 'number',
            description: 'Extra delay in ms after networkidle (default 1500).',
          },
          slug: {
            type: 'string',
            description: 'Override the slug derived from the URL path.',
          },
          full_page: {
            type: 'boolean',
            description: 'Full-page screenshot (default true).',
          },
          click_selectors: {
            type: 'array',
            items: { type: 'string' },
            description:
              'CSS selectors to click before capture (best-effort). Useful for closing modals or interacting with UI before screenshot.',
          },
          dismiss_cookies: {
            type: 'boolean',
            description:
              'Try common cookie banner accept/close buttons (OneTrust, etc.) before capture.',
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'capture_screenshots') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = ToolInputSchema.parse(request.params.arguments ?? {});
  const config = applyDefaults(args);
  const result = await capture(config);

  const summary = [
    `Saved ${result.files.length} screenshots to ${result.outputDir}`,
    `Index: ${result.indexMdPath}`,
  ];
  if (result.failures.length) {
    summary.push(`Failures: ${result.failures.length}`);
    for (const f of result.failures) {
      summary.push(`  - ${f.viewport}/${f.domain}/${f.locale}: ${f.error}`);
    }
  }

  return {
    content: [
      { type: 'text', text: summary.join('\n') },
      {
        type: 'text',
        text: JSON.stringify(
          {
            outputDir: result.outputDir,
            indexMdPath: result.indexMdPath,
            files: result.files.map((f) => ({
              path: f.path,
              locale: f.locale,
              viewport: f.viewport,
              domain: f.domain,
              url: f.url,
            })),
            failures: result.failures,
          },
          null,
          2,
        ),
      },
    ],
  };
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
