'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  User, Lock, Camera, Loader2, Check, Eye, EyeOff,
  Briefcase, FileText, Mail, Shield, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Section = 'profile' | 'security'

interface UserProfile {
  id: string
  name: string | null
  email: string | null
  image: string | null
  bio: string | null
  jobTitle: string | null
  role: string
  createdAt: string
}

export default function SettingsPage() {
  const { update: updateSession } = useSession()
  const queryClient = useQueryClient()
  const [section, setSection] = useState<Section>('profile')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  const [profileForm, setProfileForm] = useState({ name: '', bio: '', jobTitle: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const { data: me, isLoading } = useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: () => fetch('/api/users/me').then((r) => r.json()),
  })

  useEffect(() => {
    if (me) {
      setProfileForm({
        name: me.name ?? '',
        bio: me.bio ?? '',
        jobTitle: me.jobTitle ?? '',
      })
    }
  }, [me])

  const updateProfile = useMutation({
    mutationFn: (data: Partial<typeof profileForm>) =>
      fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const e = await r.json()
          throw new Error(e.error ?? 'Failed')
        }
        return r.json()
      }),
    onSuccess: async () => {
      await updateSession()
      queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success('Profile updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updatePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const e = await r.json()
          throw new Error(e.error ?? 'Failed')
        }
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Password updated')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/users/me/avatar', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      await updateSession()
      queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success('Avatar updated')
    } catch {
      toast.error('Failed to upload avatar')
      setAvatarPreview(null)
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handlePasswordSubmit = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    updatePassword.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
  }

  const navItems = [
    { id: 'profile' as Section, icon: User, label: 'Profile' },
    { id: 'security' as Section, icon: Lock, label: 'Security' },
  ]

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your account preferences and security</p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar nav */}
          <nav className="w-44 flex-shrink-0">
            <div className="space-y-1 sticky top-6">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    section === item.id
                      ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              </div>
            ) : (
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* ── PROFILE ── */}
                {section === 'profile' && (
                  <div className="space-y-6">
                    {/* Avatar card */}
                    <Card>
                      <CardHeader icon={Camera} title="Profile Photo" />
                      <div className="flex items-center gap-6 mt-4">
                        <div className="relative">
                          <Avatar className="w-20 h-20">
                            <AvatarImage src={avatarPreview ?? me?.image ?? undefined} />
                            <AvatarFallback className="bg-indigo-500/20 text-indigo-400 text-2xl">
                              {getInitials(me?.name)}
                            </AvatarFallback>
                          </Avatar>
                          {uploadingAvatar && (
                            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 animate-spin text-white" />
                            </div>
                          )}
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center transition-colors shadow-lg"
                          >
                            <Camera className="w-3.5 h-3.5 text-white" />
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{me?.name ?? 'User'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{me?.email}</p>
                          <p className="text-xs text-slate-600 mt-2">JPG, PNG or GIF · Max 5 MB</p>
                        </div>
                      </div>
                    </Card>

                    {/* Info card */}
                    <Card>
                      <CardHeader icon={User} title="Personal Info" />
                      <div className="mt-4 space-y-4">
                        <FieldRow
                          label="Full name"
                          icon={User}
                          value={profileForm.name}
                          onChange={(v) => setProfileForm((p) => ({ ...p, name: v }))}
                          placeholder="Your name"
                        />
                        <div className="space-y-1.5">
                          <Label className="text-slate-400 text-xs flex items-center gap-1.5">
                            <Mail className="w-3 h-3" />Email
                          </Label>
                          <Input
                            value={me?.email ?? ''}
                            disabled
                            className="bg-white/[0.02] border-white/[0.06] text-slate-500 cursor-not-allowed"
                          />
                          <p className="text-xs text-slate-600">Email cannot be changed.</p>
                        </div>
                        <FieldRow
                          label="Job title"
                          icon={Briefcase}
                          value={profileForm.jobTitle}
                          onChange={(v) => setProfileForm((p) => ({ ...p, jobTitle: v }))}
                          placeholder="e.g. Senior Engineer"
                        />
                        <div className="space-y-1.5">
                          <Label className="text-slate-400 text-xs flex items-center gap-1.5">
                            <FileText className="w-3 h-3" />Bio
                          </Label>
                          <Textarea
                            value={profileForm.bio}
                            onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                            placeholder="A short description about yourself…"
                            rows={3}
                            maxLength={500}
                            className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 resize-none text-sm"
                          />
                          <p className="text-xs text-slate-600 text-right">{profileForm.bio.length}/500</p>
                        </div>
                      </div>
                      <div className="flex justify-end mt-5">
                        <Button
                          onClick={() => updateProfile.mutate(profileForm)}
                          disabled={updateProfile.isPending}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                        >
                          {updateProfile.isPending
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Check className="w-3.5 h-3.5" />}
                          Save changes
                        </Button>
                      </div>
                    </Card>

                    {/* Role card */}
                    <Card>
                      <CardHeader icon={Shield} title="Account" />
                      <div className="mt-4 flex items-center gap-3">
                        <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                          {me?.role ?? 'MEMBER'}
                        </div>
                        <span className="text-xs text-slate-500">
                          Your account role
                        </span>
                      </div>
                    </Card>
                  </div>
                )}

                {/* ── SECURITY ── */}
                {section === 'security' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader icon={Lock} title="Change Password" />
                      <div className="mt-4 space-y-4">
                        <PasswordField
                          label="Current password"
                          value={passwordForm.currentPassword}
                          show={showCurrentPw}
                          onToggle={() => setShowCurrentPw((v) => !v)}
                          onChange={(v) => setPasswordForm((p) => ({ ...p, currentPassword: v }))}
                        />
                        <PasswordField
                          label="New password"
                          value={passwordForm.newPassword}
                          show={showNewPw}
                          onToggle={() => setShowNewPw((v) => !v)}
                          onChange={(v) => setPasswordForm((p) => ({ ...p, newPassword: v }))}
                          hint="At least 8 characters"
                        />
                        <div className="space-y-1.5">
                          <Label className="text-slate-400 text-xs">Confirm new password</Label>
                          <div className="relative">
                            <Input
                              type={showNewPw ? 'text' : 'password'}
                              value={passwordForm.confirmPassword}
                              onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                              placeholder="Confirm new password"
                              className={cn(
                                'bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600',
                                passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword
                                  ? 'border-red-500/50 focus:border-red-500/80'
                                  : ''
                              )}
                            />
                            {passwordForm.confirmPassword && passwordForm.confirmPassword === passwordForm.newPassword && (
                              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-5">
                        <Button
                          onClick={handlePasswordSubmit}
                          disabled={updatePassword.isPending || !passwordForm.currentPassword || !passwordForm.newPassword}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                        >
                          {updatePassword.isPending
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Lock className="w-3.5 h-3.5" />}
                          Update password
                        </Button>
                      </div>
                    </Card>

                    {/* Danger zone */}
                    <Card danger>
                      <CardHeader icon={Trash2} title="Danger Zone" danger />
                      <p className="text-xs text-slate-500 mt-2">
                        Once you delete your account, all your data will be permanently removed. This action cannot be undone.
                      </p>
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 gap-2 text-sm"
                          onClick={() => toast.error('Contact an administrator to delete your account.')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete account
                        </Button>
                      </div>
                    </Card>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Reusable sub-components ── */

function Card({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(19,19,31,0.8)',
        border: danger
          ? '1px solid rgba(239,68,68,0.15)'
          : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {children}
    </div>
  )
}

function CardHeader({
  icon: Icon, title, danger,
}: {
  icon: React.ElementType
  title: string
  danger?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{
          background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: danger ? '#ef4444' : '#6366f1' }} />
      </div>
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
    </div>
  )
}

function FieldRow({
  label, icon: Icon, value, onChange, placeholder,
}: {
  label: string
  icon: React.ElementType
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-400 text-xs flex items-center gap-1.5">
        <Icon className="w-3 h-3" />
        {label}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50"
      />
    </div>
  )
}

function PasswordField({
  label, value, show, onToggle, onChange, hint,
}: {
  label: string
  value: string
  show: boolean
  onToggle: () => void
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-400 text-xs">{label}</Label>
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-slate-600">{hint}</p>}
    </div>
  )
}
