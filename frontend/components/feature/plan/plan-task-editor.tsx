"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { PlanTask } from "@/types";

export interface TaskDraft {
  title: string;
  frequency: string;
  duration_minutes: string;
  description: string;
}

export function PlanTaskEditor({
  tasks,
  onChange,
}: {
  tasks: TaskDraft[];
  onChange: (tasks: TaskDraft[]) => void;
}) {
  const update = (i: number, patch: Partial<TaskDraft>) =>
    onChange(tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const add = () =>
    onChange([...tasks, { title: "", frequency: "", duration_minutes: "", description: "" }]);

  const remove = (i: number) => onChange(tasks.filter((_, j) => j !== i));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= tasks.length) return;
    const next = [...tasks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {tasks.length === 0 && (
        <p className="rounded-md border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-400">
          尚未添加任务，请至少添加一个训练任务
        </p>
      )}
      {tasks.map((task, i) => (
        <div
          key={i}
          className="rounded-md border border-neutral-200 bg-neutral-50/50 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <GripVertical className="h-4 w-4 text-neutral-300" />
              任务 {i + 1}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="rounded-sm px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
              >
                上移
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === tasks.length - 1}
                className="rounded-sm px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
              >
                下移
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="删除任务"
                className="rounded-sm p-1.5 text-neutral-400 hover:bg-danger-50 hover:text-danger-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="动作名称" required className="sm:col-span-1">
              <Input
                placeholder="如：靠墙静蹲"
                value={task.title}
                onChange={(e) => update(i, { title: e.target.value })}
              />
            </Field>
            <Field label="频次">
              <Input
                placeholder="如：每日 3 次"
                value={task.frequency}
                onChange={(e) => update(i, { frequency: e.target.value })}
              />
            </Field>
            <Field label="时长（分钟）">
              <Input
                inputMode="numeric"
                placeholder="如：15"
                value={task.duration_minutes}
                onChange={(e) => update(i, { duration_minutes: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="注意事项 / 说明">
              <Textarea
                rows={2}
                placeholder="动作要领、注意事项…"
                value={task.description}
                onChange={(e) => update(i, { description: e.target.value })}
              />
            </Field>
          </div>
        </div>
      ))}
      <Button variant="secondary" onClick={add} className="w-full">
        <Plus className="h-4 w-4" />
        添加任务
      </Button>
    </div>
  );
}

export function tasksToDrafts(tasks: PlanTask[]): TaskDraft[] {
  return tasks.map((t) => ({
    title: t.title,
    frequency: t.frequency ?? "",
    duration_minutes: t.duration_minutes != null ? String(t.duration_minutes) : "",
    description: t.description ?? "",
  }));
}
