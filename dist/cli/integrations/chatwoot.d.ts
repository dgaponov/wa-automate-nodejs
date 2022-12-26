import { Client } from '../..';
import { cliFlags } from '../server';
import { Request, Response } from "express";
export declare const chatwoot_webhook_check_event_name = "cli.integrations.chatwoot.check";
export type expressMiddleware = (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const chatwootMiddleware: (cliConfig: cliFlags, client: Client) => expressMiddleware;
export declare const setupChatwootOutgoingMessageHandler: (cliConfig: cliFlags, client: Client) => Promise<void>;
