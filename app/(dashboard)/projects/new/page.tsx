'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, FolderKanban } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { generateProjectKey } from '@/lib/utils'

const colors = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#f59e0b', '#10b981', '#14b8a6',
  '#3b82f6', '#06b6d4', '#84cc16', '#78716c',
]

const schema = z.object({
  name: z.string().min(2, 'Min 2 characters').max(100),
  key: z.string().min(2, 'Min 2 characters').max(6, 'Max 6 characters').regex(/^[A-Z0-9]+$/, 'Only uppercase letters and numbers'),
  description: z.string().optional(),
  color: z.string(),
})

type FormData = z.infer<typeof schema>

export default function NewProjectPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedColor, setSelectedColor] = useState(colors[0])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { color: colors[0] },
  })

  const name = watch('name')

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) =>
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error('Failed to create project')
        return r.json()
      }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project created successfully!')
      router.push(`/projects/${project.id}/board`)
    },
    onError: () => toast.error('Failed to create project'),
  })

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    register('name').onChange(e)
    if (value) {
      setValue('key', generateProjectKey(value))
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href="/projects" className="flex items-center gap-2 text-slate-500 hover:text-slate-300 mb-6 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to projects
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: selectedColor }}
          >
            <FolderKanban className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Create New Project</h1>
            <p className="text-slate-500 text-sm">Set up your project workspace</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit((data) => mutate({ ...data, color: selectedColor }))}
          className="space-y-6"
        >
          <div
            className="rounded-xl p-6 space-y-5"
            style={{
              background: 'rgba(19,19,31,0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <h2 className="text-base font-semibold text-slate-200">Project Details</h2>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-slate-300 text-sm">Project Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Nexus Platform"
                className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600"
                {...register('name', { onChange: handleNameChange })}
              />
              {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="key" className="text-slate-300 text-sm">
                Project Key *
                <span className="ml-2 text-xs text-slate-500">Used to prefix ticket IDs (e.g., NX-1)</span>
              </Label>
              <Input
                id="key"
                placeholder="e.g., NX"
                className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 uppercase"
                {...register('key', {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase()
                    register('key').onChange(e)
                  },
                })}
              />
              {errors.key && <p className="text-red-400 text-xs">{errors.key.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-slate-300 text-sm">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this project about?"
                rows={3}
                className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 resize-none"
                {...register('description')}
              />
            </div>
          </div>

          {/* Color picker */}
          <div
            className="rounded-xl p-6"
            style={{
              background: 'rgba(19,19,31,0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <h2 className="text-base font-semibold text-slate-200 mb-4">Project Color</h2>
            <div className="flex flex-wrap gap-3">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="w-8 h-8 rounded-lg transition-all duration-200"
                  style={{
                    background: color,
                    boxShadow: selectedColor === color ? `0 0 0 3px rgba(255,255,255,0.2), 0 0 12px ${color}60` : 'none',
                    transform: selectedColor === color ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              background: 'rgba(19,19,31,0.5)',
              border: `1px solid ${selectedColor}30`,
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: selectedColor }}
            >
              {watch('key')?.slice(0, 2) || 'NX'}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{watch('name') || 'Project Name'}</p>
              <p className="text-xs text-slate-500">{watch('key') || 'KEY'} • 0 tickets</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="border-white/10 text-slate-400 hover:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white flex-1"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
