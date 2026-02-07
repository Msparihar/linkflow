"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Edit2, Trash2, Loader2, FileText } from "lucide-react"

interface Template {
  id: string
  name: string
  content: string
}

interface TemplatesPanelProps {
  onSelectTemplate?: (content: string) => void
  selectionMode?: boolean
}

export function TemplatesPanel({ onSelectTemplate, selectionMode = false }: TemplatesPanelProps) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [name, setName] = useState("")
  const [content, setContent] = useState("")

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates")
      if (!res.ok) throw new Error("Failed to fetch templates")
      const data = await res.json()
      return (data.templates || []) as Template[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ id, name, content }: { id?: string; name: string; content: string }) => {
      const url = id ? `/api/templates/${id}` : "/api/templates"
      const method = id ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content }),
      })
      if (!res.ok) throw new Error("Failed to save template")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] })
      setDialogOpen(false)
      setEditingTemplate(null)
      setName("")
      setContent("")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete template")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] })
    },
  })

  const handleSave = () => {
    if (!name.trim() || !content.trim()) return
    saveMutation.mutate({ id: editingTemplate?.id, name, content })
  }

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return
    deleteMutation.mutate(id)
  }

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template)
    setName(template.name)
    setContent(template.content)
    setDialogOpen(true)
  }

  const openNewDialog = () => {
    setEditingTemplate(null)
    setName("")
    setContent("")
    setDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Message Templates</h2>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No templates yet. Create your first message template to speed up your outreach.
            </p>
            <Button className="mt-4" onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={selectionMode ? "cursor-pointer hover:border-primary transition-colors" : ""}
              onClick={() => selectionMode && onSelectTemplate?.(template.content)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {!selectionMode && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(template)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {template.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Introduction, Follow-up"
              />
            </div>
            <div>
              <Label htmlFor="content">Message Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your message template here..."
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {content.length} / 1000 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || !name.trim() || !content.trim()}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
