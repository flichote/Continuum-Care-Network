"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface CheckinPayload {
  completed: boolean;
  pain_score: number;
  note?: string;
}

export function CheckinDialog({
  open,
  onClose,
  taskTitle,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  taskTitle: string;
  onSubmit: (payload: CheckinPayload) => void;
  loading?: boolean;
}) {
  const [completed, setCompleted] = useState(true);
  const [pain, setPain] = useState(3);
  const [note, setNote] = useState("");

  const close = () => {
    onClose();
    setCompleted(true);
    setPain(3);
    setNote("");
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="任务打卡"
      width="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={loading}>
            取消
          </Button>
          <Button
            variant={completed ? "primary" : "outline"}
            onClick={() => onSubmit({ completed, pain_score: pain, note: note || undefined })}
            loading={loading}
          >
            {completed ? "确认完成" : "跳过并说明"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
          {taskTitle}
        </p>
        <Field label="完成情况">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCompleted(true)}
              className={cn(
                "flex-1 rounded-sm border px-4 py-2.5 text-sm transition-colors",
                completed
                  ? "border-primary-500 bg-primary-50 font-medium text-primary-700"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              )}
            >
              ✓ 已完成
            </button>
            <button
              type="button"
              onClick={() => setCompleted(false)}
              className={cn(
                "flex-1 rounded-sm border px-4 py-2.5 text-sm transition-colors",
                !completed
                  ? "border-warning-500 bg-warning-100 font-medium text-warning-700"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              )}
            >
              跳过
            </button>
          </div>
        </Field>
        <Field label="疼痛评分" hint="1 = 无痛，10 = 剧痛">
          <input
            type="range"
            min={1}
            max={10}
            value={pain}
            onChange={(e) => setPain(Number(e.target.value))}
            className="w-full accent-primary-600"
          />
          <div className="flex justify-between text-xs text-neutral-400">
            <span>1</span>
            <span className="text-base font-semibold text-primary-700 tabular-nums">{pain}</span>
            <span>10</span>
          </div>
        </Field>
        <Field label="备注（可选）">
          <Textarea
            rows={3}
            placeholder="记录完成感受或跳过原因…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Dialog>
  );
}
