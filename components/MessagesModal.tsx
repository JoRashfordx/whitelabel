
import React, { useState, useEffect, useRef } from 'react';
import { User, Profile, Conversation, Message } from '../types';
import { supabase } from '../services/supabase';
import { 
  X, Send, Paperclip, Smile, Search, ShieldAlert, 
  Trash2, AlertOctagon, Check, CheckCheck, Loader2,
  FileText, Ban, MoreVertical, User as UserIcon
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import Tooltip from './Tooltip';
import MiniProfileModal from './MiniProfileModal';

interface MessagesModalProps {
  user: User;
  onClose: () => void;
  initialRecipientId?: string | null;
  onMessagesUpdate?: () => void;
  onProfileClick: (userId: string) => void;
}

const POPULAR_EMOJIS = ['👍', '😂', '❤️', '🔥', '👋', '😭', '🎉', '👀', '🤔', '💯'];

const MessagesModal: React.FC<MessagesModalProps> = ({ user, onClose, initialRecipientId, onMessagesUpdate, onProfileClick }) => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeRecipient, setActiveRecipient] = useState<Profile | null>(null);
  
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasBlockedThem, setHasBlockedThem] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  
  // Mini Profile State
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);

  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize: Fetch conversations
  useEffect(() => {
    const init = async () => {
      setIsLoadingConversations(true);
      
      let convs: Conversation[] | null = null;
      
      try {
        const { data, error } = await supabase.rpc('get_visible_conversations');
        if (!error && data) {
          convs = data;
        } else {
          // Fallback to standard query if RPC missing
          console.warn("RPC missing, using fallback query");
          const { data: fallbackData } = await supabase
            .from('conversations')
            .select('*')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .order('last_message_at', { ascending: false });
          convs = fallbackData;
        }
      } catch (err) {
        console.error("Error loading conversations:", err);
      }

      const enhancedConvs: Conversation[] = [];
      for (const c of convs || []) {
        // Double check visibility client-side for fallback data
        if (c.user1_id === user.id && c.user1_visible === false) continue;
        if (c.user2_id === user.id && c.user2_visible === false) continue;

        const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id;
        const { data: otherProfile } = await supabase.from('profiles').select('*').eq('id', otherId).single();
        if (otherProfile) {
          enhancedConvs.push({ ...c, other_user: otherProfile });
        }
      }
      setConversations(enhancedConvs);

      // Handle Initial Recipient
      if (initialRecipientId) {
        const existingConv = enhancedConvs.find(c => 
          (c.user1_id === user.id && c.user2_id === initialRecipientId) || 
          (c.user2_id === user.id && c.user1_id === initialRecipientId)
        );

        if (existingConv) {
          setActiveConversationId(existingConv.id);
          setActiveRecipient(existingConv.other_user || null);
        } else {
          const { data: recipientProfile } = await supabase.from('profiles').select('*').eq('id', initialRecipientId).single();
          if (recipientProfile) {
            setActiveRecipient(recipientProfile);
          }
        }
      } else if (enhancedConvs.length > 0 && !activeConversationId) {
        setActiveConversationId(enhancedConvs[0].id);
        setActiveRecipient(enhancedConvs[0].other_user || null);
      }
      
      setIsLoadingConversations(false);
    };

    init();
  }, [user.id, initialRecipientId]);

  // Load Messages
  useEffect(() => {
    if (!activeRecipient) return;
    setShowOptions(false); // Close menu on chat change

    const loadChat = async () => {
      // Check Block Status
      const { data: blockData } = await supabase
        .from('blocked_users')
        .select('*')
        .or(`and(blocker_id.eq.${activeRecipient.id},blocked_id.eq.${user.id}),and(blocker_id.eq.${user.id},blocked_id.eq.${activeRecipient.id})`);
      
      const blockedByThem = blockData?.some(b => b.blocker_id === activeRecipient.id);
      const blockedByMe = blockData?.some(b => b.blocker_id === user.id);
      
      setIsBlocked(!!blockedByThem);
      setHasBlockedThem(!!blockedByMe);

      if (activeConversationId) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', activeConversationId)
          .order('created_at', { ascending: true });
        
        // Client-side filtering of deleted messages
        const visibleMsgs = (msgs || []).filter(m => {
           if (m.sender_id === user.id && m.deleted_by_sender) return false;
           if (m.recipient_id === user.id && m.deleted_by_recipient) return false;
           return true;
        });

        setMessages(visibleMsgs);
        
        // Mark as read
        const unreadIds = visibleMsgs.filter(m => m.recipient_id === user.id && !m.is_read).map(m => m.id) || [];
        if (unreadIds.length > 0) {
          await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
          if (onMessagesUpdate) onMessagesUpdate();
        }
      } else {
        setMessages([]);
      }
    };

    loadChat();

    if (activeConversationId) {
      const channel = supabase
        .channel(`chat_${activeConversationId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversationId}` },
          (payload) => {
             const newMsg = payload.new as Message;
             setMessages(prev => {
                const exists = prev.some(m => m.id === newMsg.id);
                if (exists) return prev;
                return [...prev, newMsg];
             });
             if (newMsg.recipient_id === user.id) {
               supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
             }
          }
        )
        .subscribe();
      
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeConversationId, activeRecipient, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, attachment]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !attachment) || !activeRecipient || isSending) return;
    
    if (isBlocked) {
      addToast({ type: 'error', title: 'Blocked', message: 'You cannot message this user.' });
      return;
    }
    if (hasBlockedThem) {
      if (!(await confirm({ 
        title: 'Unblock User?',
        description: 'You blocked this user. Unblock to send message?',
        confirmText: 'Unblock & Send',
        variant: 'warning'
      }))) return;
      
      await supabase.from('blocked_users').delete().eq('blocker_id', user.id).eq('blocked_id', activeRecipient.id);
      setHasBlockedThem(false);
    }

    setIsSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimisiticMessage: Message = {
      id: tempId,
      conversation_id: activeConversationId || '',
      sender_id: user.id,
      recipient_id: activeRecipient.id,
      content: newMessage,
      attachment_url: attachment ? URL.createObjectURL(attachment) : null,
      attachment_type: attachment?.type.startsWith('image/') ? 'image' : 'file',
      is_read: false,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisiticMessage]);
    setNewMessage('');
    setAttachment(null);

    try {
      let conversationId = activeConversationId;

      if (!conversationId) {
        // Ensure consistent ID ordering for unique constraint
        const id1 = user.id < activeRecipient.id ? user.id : activeRecipient.id;
        const id2 = user.id < activeRecipient.id ? activeRecipient.id : user.id;

        const { data: existing } = await supabase.from('conversations').select('*').eq('user1_id', id1).eq('user2_id', id2).maybeSingle();
        
        if (existing) {
          conversationId = existing.id;
        } else {
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert([{ user1_id: id1, user2_id: id2 }])
            .select()
            .single();
          if (convError) throw convError;
          conversationId = newConv.id;
          setConversations(prev => [{...newConv, other_user: activeRecipient} as Conversation, ...prev]);
        }
        setActiveConversationId(conversationId);
      }

      // Handle Attachment
      let attachmentUrl = null;
      let attachmentType = null;
      if (attachment) {
         const fileExt = attachment.name.split('.').pop();
         const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
         await supabase.storage.from('message-attachments').upload(fileName, attachment);
         const { data: { publicUrl } } = supabase.storage.from('message-attachments').getPublicUrl(fileName);
         attachmentUrl = publicUrl;
         attachmentType = attachment.type.startsWith('image/') ? 'image' : 'file';
      }

      const { data: sentMsg, error: msgError } = await supabase.from('messages').insert([{
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: activeRecipient.id,
        content: optimisiticMessage.content,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        is_read: false,
        deleted_by_sender: false,
        deleted_by_recipient: false
      }]).select().single();

      if (msgError) throw msgError;

      setMessages(prev => prev.map(m => m.id === tempId ? (sentMsg as Message) : m));

      // Make visible for both again (This undeletes the conversation for the other user if they deleted it)
      await supabase.from('conversations').update({ 
        last_message_at: new Date().toISOString(),
        user1_visible: true,
        user2_visible: true
      }).eq('id', conversationId);
      
      setConversations(prev => {
        const updated = prev.map(c => c.id === conversationId ? { ...c, last_message_at: new Date().toISOString() } : c);
        return updated.sort((a,b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      });

    } catch (err: any) {
      console.error("Failed to send", err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      addToast({ type: 'error', title: 'Failed', message: err.message || 'Network error' });
    } finally {
      setIsSending(false);
    }
  };

  const handleBlockUser = async () => {
    if (!activeRecipient) return;
    try {
      if (hasBlockedThem) {
        await supabase.from('blocked_users').delete().eq('blocker_id', user.id).eq('blocked_id', activeRecipient.id);
        setHasBlockedThem(false);
        addToast({ type: 'success', message: 'User unblocked.' });
      } else {
        if (await confirm({
          title: `Block ${activeRecipient.username}?`,
          description: 'They will not be able to message you.',
          confirmText: 'Block',
          variant: 'danger'
        })) {
          await supabase.from('blocked_users').insert([{ blocker_id: user.id, blocked_id: activeRecipient.id }]);
          setHasBlockedThem(true);
          addToast({ type: 'success', message: 'User blocked.' });
        }
      }
      setShowOptions(false);
    } catch (err: any) {
      addToast({ type: 'error', message: "Failed to update block status." });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    // UI Update first (Optimistic)
    setMessages(prev => prev.filter(m => m.id !== messageId));

    try {
      // 1. Try RPC
      const { error: rpcError } = await supabase.rpc('delete_message_for_user', { p_message_id: messageId });
      
      // 2. Fallback
      if (rpcError) {
        // We assume we are the sender if the button was shown, but let's be safe and try both
        await supabase.from('messages').update({ deleted_by_sender: true }).eq('id', messageId).eq('sender_id', user.id);
        await supabase.from('messages').update({ deleted_by_recipient: true }).eq('id', messageId).eq('recipient_id', user.id);
      }

      if (onMessagesUpdate) onMessagesUpdate();
    } catch (err) {
      console.error("Delete message failed", err);
    }
  };

  const handleDeleteThread = async () => {
    if (!activeConversationId || !activeRecipient) return;
    
    if (!(await confirm({
      title: 'Delete Conversation?',
      description: `Permanently delete chat with ${activeRecipient.username}?`,
      confirmText: 'Delete',
      variant: 'danger'
    }))) return;

    const convId = activeConversationId;
    
    // Optimistic UI
    setConversations(prev => prev.filter(c => c.id !== convId));
    setActiveConversationId(null);
    setActiveRecipient(null);
    setMessages([]);
    setShowOptions(false);

    try {
      // 1. Try RPC
      const { error: rpcError } = await supabase.rpc('delete_conversation_for_user', { p_conversation_id: convId });

      if (rpcError) {
        console.warn("RPC failed, using fallback manual delete");
        // Fallback: Manually Hide Conversation
        await supabase.from('conversations').update({ user1_visible: false }).eq('id', convId).eq('user1_id', user.id);
        await supabase.from('conversations').update({ user2_visible: false }).eq('id', convId).eq('user2_id', user.id);

        // Fallback: Manually Hide Messages
        await supabase.from('messages').update({ deleted_by_sender: true }).eq('conversation_id', convId).eq('sender_id', user.id);
        await supabase.from('messages').update({ deleted_by_recipient: true }).eq('conversation_id', convId).eq('recipient_id', user.id);
      }
      
      if (onMessagesUpdate) onMessagesUpdate();
      addToast({ type: 'success', message: 'Conversation deleted.' });

    } catch (err: any) {
      console.error("Delete thread failed:", err);
      addToast({ type: 'error', message: "Failed to delete conversation." });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setAttachment(e.target.files[0]);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* SHARED MINI PROFILE MODAL */}
      {viewingProfile && (
        <MiniProfileModal 
            profile={viewingProfile} 
            onClose={() => setViewingProfile(null)}
            onViewChannel={() => {
                onProfileClick(viewingProfile.id);
                setViewingProfile(null);
                onClose(); // Close messages modal too if navigating away
            }}
            onReport={() => {
                addToast({ type: 'info', message: 'User reported.' });
                setViewingProfile(null);
            }}
        >
            <button 
                onClick={handleBlockUser}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-rose-400 hover:text-rose-300 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
                <Ban className="w-3 h-3" /> {hasBlockedThem ? 'Unblock' : 'Block'}
            </button>
        </MiniProfileModal>
      )}

      <div className="bg-[#050505] border border-white/10 w-full max-w-5xl h-[85vh] shadow-2xl flex overflow-hidden rounded-lg font-comfortaa">
        
        {/* LEFT SIDEBAR (List) */}
        <div className={`w-80 border-r border-white/5 flex flex-col bg-[#0a0a0a] ${activeConversationId ? 'hidden md:flex' : 'flex w-full'}`}>
          <div className="p-4 border-b border-white/5">
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-sm font-black text-white uppercase tracking-widest">Inbox</h2>
               <button onClick={onClose} className="md:hidden p-2 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
             </div>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Filter conversations..." 
                  className="w-full bg-[#111] border border-white/5 py-2 pl-8 pr-4 text-[10px] text-white focus:outline-none focus:border-brand"
                />
             </div>
          </div>
          <div className="flex-1 overflow-y-auto">
             {isLoadingConversations ? (
               <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
             ) : conversations.length === 0 ? (
               <div className="p-8 text-center text-zinc-600">
                 <p className="text-[10px] font-black uppercase">No messages yet</p>
               </div>
             ) : (
               conversations.map(c => {
                 const other = c.other_user;
                 if (!other) return null;
                 const isActive = c.id === activeConversationId;
                 return (
                   <div 
                     key={c.id} 
                     onClick={() => { setActiveConversationId(c.id); setActiveRecipient(other); }}
                     className={`p-4 flex items-center gap-3 cursor-pointer transition-colors border-l-2 ${isActive ? 'bg-white/5 border-brand' : 'border-transparent hover:bg-white/5 hover:border-white/10'}`}
                   >
                     <div className="w-10 h-10 bg-zinc-800 rounded-full overflow-hidden shrink-0">
                       <img src={other.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${other.id}`} className="w-full h-full object-cover" />
                     </div>
                     <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center mb-1">
                           <h4 className="text-[11px] font-black text-white uppercase truncate">{other.username}</h4>
                           <span className="text-[9px] text-zinc-600">{new Date(c.last_message_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate">Click to read messages...</p>
                     </div>
                   </div>
                 );
               })
             )}
          </div>
        </div>

        {/* RIGHT SIDE (Chat) */}
        <div className={`flex-1 flex flex-col min-w-0 bg-[#050505] relative ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
           {/* Header */}
           <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a]">
              {activeRecipient ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveConversationId(null)} className="md:hidden text-zinc-500 mr-2"><X className="w-5 h-5" /></button>
                  <div 
                    className="flex items-center gap-3 cursor-pointer p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors group"
                    onClick={() => setViewingProfile(activeRecipient)}
                  >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-white/10 group-hover:border-brand/50 transition-colors">
                         <img src={activeRecipient.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${activeRecipient.id}`} className="w-full h-full object-cover" />
                      </div>
                      <div>
                         <h3 className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-1">
                             {activeRecipient.username} 
                             <UserIcon className="w-3 h-3 text-zinc-500 group-hover:text-brand" />
                         </h3>
                         <div className="flex gap-2">
                             {isBlocked && <span className="text-[9px] text-rose-500 font-bold uppercase flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Blocked You</span>}
                             {hasBlockedThem && <span className="text-[9px] text-zinc-500 font-bold uppercase flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> You Blocked</span>}
                         </div>
                      </div>
                  </div>
                </div>
              ) : (
                <h3 className="text-xs font-black text-white uppercase">New Message</h3>
              )}
              
              <div className="flex items-center gap-2">
                 {/* OPTIONS MENU */}
                 {activeConversationId && activeRecipient && (
                   <div className="relative">
                     <button 
                       onClick={() => setShowOptions(!showOptions)}
                       className="p-2 hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
                     >
                       <MoreVertical className="w-5 h-5" />
                     </button>
                     {showOptions && (
                       <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-white/10 shadow-xl z-50 flex flex-col animate-in fade-in slide-in-from-top-2">
                          <button 
                            onClick={handleDeleteThread}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-zinc-400 hover:text-rose-500 transition-colors text-[10px] font-black uppercase tracking-widest text-left"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Conversation
                          </button>
                          <button 
                            onClick={handleBlockUser}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-zinc-400 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest text-left"
                          >
                            <Ban className="w-3.5 h-3.5" /> {hasBlockedThem ? 'Unblock User' : 'Block User'}
                          </button>
                       </div>
                     )}
                   </div>
                 )}
                 <button onClick={onClose} className="hidden md:block p-2 hover:bg-white/5 text-zinc-500 hover:text-white transition-colors">
                   <X className="w-5 h-5" />
                 </button>
              </div>
           </div>

           {/* Messages Area */}
           <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!activeRecipient ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                  <Send className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Select a conversation</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === user.id;
                  
                  return (
                    <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {isMe ? (
                            <div className="flex flex-row-reverse items-end gap-3 group max-w-[85%]">
                                {/* Delete Button - Left of bubble (Visually right due to reverse row, wait... no, logically left) */}
                                {/* In flex-row-reverse: 1. Bubble, 2. Delete Button */}
                                
                                {/* Bubble */}
                                <div className="bg-brand text-white p-3 md:p-4 rounded-l-2xl rounded-tr-2xl rounded-br-sm shadow-lg relative text-left">
                                    {msg.attachment_url && (
                                        <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                                            {msg.attachment_type === 'image' ? (
                                                <img src={msg.attachment_url} className="max-w-full max-h-60 object-cover" />
                                            ) : (
                                                <a href={msg.attachment_url} target="_blank" className="flex items-center gap-2 text-xs font-bold underline bg-black/20 p-3 hover:bg-black/30 transition-colors">
                                                    <FileText className="w-4 h-4" /> View Attachment
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                                        <span className="text-[8px] font-bold">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        {msg.is_read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                    </div>
                                </div>

                                {/* Delete Button */}
                                <Tooltip content="Delete Message">
                                    <button 
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-zinc-600 hover:text-rose-500 mb-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </Tooltip>
                            </div>
                        ) : (
                            <div className="flex items-end gap-3 max-w-[85%] group">
                                {/* Avatar */}
                                <div 
                                    className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 overflow-hidden mb-1 shrink-0 cursor-pointer hover:border-brand transition-colors"
                                    onClick={() => setViewingProfile(activeRecipient)}
                                >
                                    <img src={activeRecipient.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${activeRecipient.id}`} className="w-full h-full object-cover" />
                                </div>

                                {/* Bubble */}
                                <div className="bg-[#1a1a1a] text-zinc-100 border border-white/10 p-3 md:p-4 rounded-r-2xl rounded-tl-2xl rounded-bl-sm shadow-sm">
                                    {msg.attachment_url && (
                                        <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                                            {msg.attachment_type === 'image' ? (
                                                <img src={msg.attachment_url} className="max-w-full max-h-60 object-cover" />
                                            ) : (
                                                <a href={msg.attachment_url} target="_blank" className="flex items-center gap-2 text-xs font-bold underline bg-white/5 p-3 hover:bg-white/10 transition-colors">
                                                    <FileText className="w-4 h-4" /> View Attachment
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    <div className="text-[8px] font-bold text-zinc-500 mt-1 text-right">
                                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
           </div>

           {/* Input Area */}
           {activeRecipient && (
             <div className="p-4 bg-[#0a0a0a] border-t border-white/5">
                {(isBlocked || hasBlockedThem) ? (
                   <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-center flex items-center justify-center gap-3">
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                        Messaging Unavailable
                      </p>
                      {hasBlockedThem && (
                        <button onClick={handleBlockUser} className="text-[10px] underline text-rose-400 hover:text-rose-200 font-bold">Unblock</button>
                      )}
                   </div>
                ) : (
                   <div className="flex flex-col gap-2">
                      {attachment && (
                        <div className="flex items-center gap-2 bg-white/5 p-2 w-fit border border-white/10 rounded-lg">
                           <FileText className="w-4 h-4 text-brand" />
                           <span className="text-[10px] font-bold text-white truncate max-w-[200px]">{attachment.name}</span>
                           <button onClick={() => setAttachment(null)} className="text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>
                        </div>
                      )}
                      <form onSubmit={handleSendMessage} className="flex gap-2 relative items-end">
                        <Tooltip content="Attach File">
                          <button type="button" onClick={() => attachmentInputRef.current?.click()} className="p-3 bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/10 mb-0.5">
                             <Paperclip className="w-5 h-5" />
                          </button>
                        </Tooltip>
                        <input type="file" ref={attachmentInputRef} className="hidden" onChange={handleFileSelect} />
                        
                        <div className="flex-1 relative bg-[#111] border border-white/10 rounded-3xl flex items-center">
                           <input 
                             type="text" 
                             value={newMessage}
                             onChange={(e) => setNewMessage(e.target.value)}
                             className="w-full bg-transparent p-3 pl-4 pr-10 text-sm text-white focus:outline-none placeholder-zinc-600 rounded-3xl"
                             placeholder="Type a message..."
                           />
                           <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="absolute right-3 text-zinc-500 hover:text-brand transition-colors">
                              <Smile className="w-5 h-5" />
                           </button>
                           {showEmojiPicker && (
                              <div className="absolute bottom-full right-0 mb-2 p-2 bg-[#111] border border-white/10 grid grid-cols-5 gap-1 shadow-2xl z-50 rounded-xl">
                                 {POPULAR_EMOJIS.map(e => (
                                   <button key={e} type="button" onClick={() => { setNewMessage(prev => prev + e); setShowEmojiPicker(false); }} className="text-xl p-2 hover:bg-white/10 rounded-lg transition-colors">
                                     {e}
                                   </button>
                                 ))}
                              </div>
                           )}
                        </div>

                        <button 
                          type="submit" 
                          disabled={isSending || (!newMessage.trim() && !attachment)} 
                          className="bg-brand text-always-white p-3 hover:brightness-110 disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-brand/20 rounded-full mb-0.5"
                        >
                           {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                      </form>
                   </div>
                )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default MessagesModal;
