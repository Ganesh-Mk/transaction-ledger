import { Router } from "express";
import { methodNotAllowed } from "../../middleware/methodNotAllowed.js";
import { parseOrThrow } from "../../lib/validation.js";
import { CreateTransferBody, ListTransfersQuery, TransferIdParams } from "./transfer.schemas.js";
import { transferService } from "./transfer.service.js";

export const transferRouter = Router();

transferRouter
  .route("/")
  .post(async (req, res) => {
    const input = parseOrThrow(CreateTransferBody, req.body);
    res.status(201).json({ data: await transferService.create(input) });
  })
  .get(async (req, res) => {
    const { page, limit, account_id } = parseOrThrow(ListTransfersQuery, req.query);
    res.json(await transferService.list(page, limit, account_id));
  });

transferRouter
  .route("/:transferId")
  .get(async (req, res) => {
    const { transferId } = parseOrThrow(TransferIdParams, req.params);
    res.json({ data: await transferService.get(transferId) });
  })
  .all(methodNotAllowed(["GET"], "Transfers are immutable: they cannot be edited or deleted once created"));
