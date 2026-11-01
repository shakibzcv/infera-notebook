'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Settings, Trash2, MessageSquareX, FileX, StickyNote, AlertTriangle } from 'lucide-react';
import { useNotebookStore } from '@/hooks/use-notebook-store';
import { useChatStore } from '@/hooks/use-chat-store';
import { toast } from 'sonner';

interface NotebookSettingsDialogProps {
  notebookId: string;
}

type ActionConfig = {
  id: 'sources' | 'notes' | 'chats' | 'notebook';
  label: string;
  icon: any;
  destructive?: boolean;
};

const ACTIONS: ActionConfig[] = [
  { id: 'sources', label: 'Delete All Sources', icon: FileX },
  { id: 'notes', label: 'Delete All Notes', icon: StickyNote },
  { id: 'chats', label: 'Delete All Chats', icon: MessageSquareX },
  { id: 'notebook', label: 'Delete This Notebook', icon: Trash2, destructive: true },
];

/**
 * NotebookSettingsDialog component.
 * Provides a management interface for the notebook, allowing users to:
 * - Delete all sources.
 * - Delete all notes.
 * - Delete all chats.
 * - Delete the entire notebook.
 * Features confirmation dialogs for all destructive actions.
 */
export function NotebookSettingsDialog({ notebookId }: NotebookSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ActionConfig | null>(null);

  const router = useRouter();
  const { notebooks, setNotebooks } = useNotebookStore();

  const handleExecuteAction = async () => {
    if (!confirmAction) return;

    const action = confirmAction.id;
    const label = confirmAction.label.toLowerCase();

    setLoading(action);
    setConfirmAction(null); // Close confirmation

    try {
      let url = '';
      let body: any = null;

      switch (action) {
        case 'sources':
          url = `/api/notebooks/${notebookId}/sources`;
          break;
        case 'notes':
          url = `/api/notebooks/${notebookId}/notes`;
          body = { all: true };
          break;
        case 'chats':
          url = `/api/notebooks/${notebookId}/chats`;
          break;
        case 'notebook':
          url = `/api/notebooks/${notebookId}`;
          break;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Failed to ${label}`);
      }

      toast.success(`Successfully completed: ${confirmAction.label}`);

      if (action === 'notebook') {
        const safeNotebooks = Array.isArray(notebooks) ? notebooks : [];
        setNotebooks(safeNotebooks.filter((nb) => nb.id !== notebookId));
        router.push('/notebooks');
      } else {
        if (action === 'chats') {
          await useChatStore.getState().fetchChats(notebookId);
        } else if (action === 'sources') {
          useNotebookStore.getState().setSources([]);
          useNotebookStore.getState().setSelectedSourceIds([]);
        } else if (action === 'notes') {
          useNotebookStore.getState().clearNotes();
        }
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      toast.error(`Error: Failed to ${label}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted transition-colors shrink-0"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl bg-card/95 backdrop-blur-xl">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Notebook Settings
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Manage your notebook data and workspace preferences.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-3 pb-6 space-y-1">
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  disabled={!!loading}
                  onClick={() => setConfirmAction(action)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group
                    ${
                      action.destructive
                        ? 'text-destructive hover:bg-destructive/10'
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    }
                    ${loading === action.id ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div
                    className={`p-2 rounded-lg transition-colors
                    ${
                      action.destructive
                        ? 'bg-destructive/10 group-hover:bg-destructive/20'
                        : 'bg-muted group-hover:bg-accent-foreground/10'
                    }
                  `}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left">
                    {loading === action.id ? 'Processing...' : action.label}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-50 transition-opacity">
                    Action
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="border-none shadow-2xl bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              This will permanently {confirmAction?.label.toLowerCase()}. This action cannot be
              undone and all associated data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
            <AlertDialogCancel className="rounded-full px-6">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteAction}
              className="bg-destructive hover:bg-destructive/90 rounded-full px-6 text-destructive-foreground"
            >
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
