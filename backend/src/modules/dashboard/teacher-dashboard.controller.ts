import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import {
  getTeacherDashboardData,
  getTeacherStudentsByEnseignement,
  markTeacherStudentAttendance,
  saveTeacherStudentNotes,
  setTeacherStudentExclusionOverride,
} from "./teacher-dashboard.service";

export const getTeacherDashboardHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const data = await getTeacherDashboardData(req.user.id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch teacher dashboard";
    const statusCode = message.includes("not found") ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

export const getTeacherStudentsByModuleHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const enseignementId = Number(req.params.enseignementId);
    if (!Number.isFinite(enseignementId) || enseignementId <= 0) {
      res.status(400).json({ success: false, message: "Invalid enseignement id" });
      return;
    }

    const data = await getTeacherStudentsByEnseignement(req.user.id, enseignementId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch students";
    const statusCode = message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({ success: false, message });
  }
};

export const saveTeacherStudentNotesHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const payload = {
      etudiantId: Number(req.body?.etudiantId),
      enseignementId: Number(req.body?.enseignementId),
      note_exam: req.body?.note_exam ?? null,
      note_td: req.body?.note_td ?? null,
      note_tp: req.body?.note_tp ?? null,
    };

    if (!Number.isFinite(payload.etudiantId) || !Number.isFinite(payload.enseignementId)) {
      res.status(400).json({ success: false, message: "Invalid notes payload" });
      return;
    }

    const notes = await saveTeacherStudentNotes(req.user.id, payload);
    res.status(200).json({ success: true, data: notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save notes";
    const statusCode = message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({ success: false, message });
  }
};

export const markTeacherStudentAttendanceHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const payload = {
      etudiantId: Number(req.body?.etudiantId),
      enseignementId: Number(req.body?.enseignementId),
      date: String(req.body?.date || new Date().toISOString()),
      present: Boolean(req.body?.present),
      justifie: Boolean(req.body?.justifie),
      unmark: Boolean(req.body?.unmark),
    };

    if (!Number.isFinite(payload.etudiantId) || !Number.isFinite(payload.enseignementId)) {
      res.status(400).json({ success: false, message: "Invalid attendance payload" });
      return;
    }

    const history = await markTeacherStudentAttendance(req.user.id, payload);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark attendance";
    const statusCode = message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({ success: false, message });
  }
};

export const setTeacherStudentExclusionOverrideHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const etudiantId = Number(req.params.etudiantId);
    const enseignementId = Number(req.body?.enseignementId);
    const overridden = Boolean(req.body?.overridden);

    if (!Number.isFinite(etudiantId) || !Number.isFinite(enseignementId)) {
      res.status(400).json({ success: false, message: "Invalid exclusion payload" });
      return;
    }

    const isOverridden = await setTeacherStudentExclusionOverride(req.user.id, {
      etudiantId,
      enseignementId,
      overridden,
    });

    res.status(200).json({ success: true, data: { isOverridden } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update exclusion override";
    const statusCode = message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({ success: false, message });
  }
};
