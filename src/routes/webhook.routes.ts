import { Router } from "express";
import { WeComWebhook } from "../models/mongoose";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";
import { log } from "../utils/logger";

const router = Router();

// Middleware de autorização em todas as rotas
router.use(requireAuth, requireAdmin);

// Listar todos os webhooks
router.get("/", async (req, res) => {
  try {
    const webhooks = await WeComWebhook.find().sort({ created_at: -1 });
    res.json(webhooks);
  } catch (error) {
    log(`Erro ao buscar webhooks: ${error}`, "ERROR");
    res.status(500).json({ error: "Erro interno ao buscar webhooks." });
  }
});

// Criar um novo webhook
router.post("/", async (req, res) => {
  try {
    const { name, url, ticketTypes } = req.body;

    if (!url) {
      return res.status(400).json({ error: "A URL do Webhook é obrigatória." });
    }

    const newWebhook = new WeComWebhook({
      id: uuidv4(),
      name: name || "Novo Grupo",
      url,
      ticketTypes: ticketTypes || []
    });

    await newWebhook.save();
    res.status(201).json(newWebhook);
  } catch (error) {
    log(`Erro ao criar webhook: ${error}`, "ERROR");
    res.status(500).json({ error: "Erro ao criar integração WeCom." });
  }
});

// Editar um webhook
router.put("/:id", async (req, res) => {
  try {
    const { name, url, ticketTypes } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "A URL do Webhook é obrigatória." });
    }

    const updatedWebhook = await WeComWebhook.findOneAndUpdate(
      { id: req.params.id },
      { name, url, ticketTypes },
      { new: true }
    );

    if (!updatedWebhook) {
      return res.status(404).json({ error: "Webhook não encontrado." });
    }

    res.json(updatedWebhook);
  } catch (error) {
    log(`Erro ao atualizar webhook: ${error}`, "ERROR");
    res.status(500).json({ error: "Erro ao atualizar integração WeCom." });
  }
});

// Excluir um webhook
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await WeComWebhook.findOneAndDelete({ id: req.params.id });
    if (!deleted) {
      return res.status(404).json({ error: "Webhook não encontrado." });
    }
    res.json({ message: "Webhook excluído com sucesso." });
  } catch (error) {
    log(`Erro ao excluir webhook: ${error}`, "ERROR");
    res.status(500).json({ error: "Erro ao excluir integração WeCom." });
  }
});

export default router;
