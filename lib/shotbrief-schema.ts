import { z } from "zod";

export const platformSchema = z.enum(["ios", "android"]);

export const slideSchema = z.object({
  id: z.string().min(1),
  headline: z.string().min(1).max(96),
  subheadline: z.string().max(280).optional(),
  device: platformSchema,
  mockup: z.string().min(1),
  layout: z.enum(["device_center", "device_left", "device_right", "device_stack"]),
  background: z.object({
    type: z.enum(["solid", "gradient"]),
    colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).min(1).max(3)
  }),
  decorations: z
    .array(
      z.object({
        type: z.enum(["glow", "grid", "line", "badge"]),
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        size: z.number().min(24).max(800),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        opacity: z.number().min(0).max(1)
      })
    )
    .default([]),
  text: z
    .object({
      align: z.enum(["left", "center", "right"]),
      position: z.enum(["top", "middle", "bottom"])
    })
    .default({ align: "center", position: "top" })
});

export const layoutSchema = z.object({
  slides: z.array(slideSchema).min(1).max(20)
});

export type LayoutPlan = z.infer<typeof layoutSchema>;
export type SlidePlan = z.infer<typeof slideSchema>;
