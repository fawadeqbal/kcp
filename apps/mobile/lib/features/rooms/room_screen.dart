import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../api/api_error.dart';
import '../../auth/auth_controller.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import 'rooms_data.dart';

/// How often an open room checks for new messages.
const roomPollInterval = Duration(seconds: 5);

/// The student's rooms (teams, classes, events), newest activity first.
class RoomsScreen extends ConsumerWidget {
  const RoomsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final rooms = ref.watch(roomsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(t.roomsTitle)),
      body: switch (rooms) {
        AsyncData(:final value) => RefreshIndicator(
          onRefresh: () => ref.refresh(roomsProvider.future),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            children: [
              Text(t.roomsSubtitle, style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 16),
              if (value.isEmpty)
                SectionCard(child: Text(t.roomsNone))
              else
                for (final room in value)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: RoomTile(
                      room: room,
                      onTap: () async {
                        await context.push('/rooms/${room.id}');
                        ref.invalidate(roomsProvider);
                      },
                    ),
                  ),
            ],
          ),
        ),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(roomsProvider),
        ),
        _ => const LoadingView(),
      },
    );
  }
}

/// One room in a list: its name, kind, and new messages.
class RoomTile extends StatelessWidget {
  const RoomTile({super.key, required this.room, required this.onTap});

  final ChatRoomDto room;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final p = context.kcp;
    final unread = room.unread.toInt();
    return SectionCard(
      onTap: onTap,
      radius: KcpRadius.row,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: MergeSemantics(
        child: Row(
          children: [
            KcpIcon(switch (room.kind) {
              ChatRoomDtoKindEnum.CLASS => 'graduation',
              ChatRoomDtoKindEnum.EVENT => 'trophy',
              _ => 'users',
            }, color: p.brandText),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(room.name, style: Theme.of(context).textTheme.titleMedium),
                  Text(
                    room.archived ? t.roomClosed : roomKindText(t, room.kind),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            if (unread > 0)
              KcpPill(
                label: '$unread',
                background: p.brand,
                color: p.onPrimary,
                semanticLabel: t.roomUnread(unread),
              ),
            const SizedBox(width: 6),
            KcpIcon('chevR', size: 18, color: p.muted),
          ],
        ),
      ),
    );
  }
}

/// A room: its messages, and for members the phrases, a text box (13 and older) and a
/// report button on other people's messages. [childId] opens a child's room for their
/// parent, read only.
class RoomScreen extends ConsumerStatefulWidget {
  const RoomScreen({super.key, required this.roomId, this.childId});

  final String roomId;
  final String? childId;

  @override
  ConsumerState<RoomScreen> createState() => _RoomScreenState();
}

class _RoomScreenState extends ConsumerState<RoomScreen> {
  ChatRoomDto? _room;
  List<ChatMessageDto> _messages = const [];
  Object? _error;
  bool _busy = false;
  Timer? _poll;
  final _text = TextEditingController();
  final _scroll = ScrollController();

  bool get _member => widget.childId == null;

  @override
  void initState() {
    super.initState();
    _load();
    _poll = Timer.periodic(roomPollInterval, (_) => _load(quiet: true));
  }

  @override
  void dispose() {
    _poll?.cancel();
    _text.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load({bool quiet = false}) async {
    final rooms = ref.read(apiProvider).getRoomsApi();
    try {
      final page = widget.childId == null
          ? (await rooms.chatMessages(id: widget.roomId)).data!
          : (await rooms.parentChatMessages(childId: widget.childId!, roomId: widget.roomId)).data!;
      if (!mounted) return;
      final grew = page.messages.length != _messages.length;
      setState(() {
        _room = page.room;
        _messages = page.messages;
        _error = null;
      });
      if (grew) _toEnd();
      if (_member && page.room.unread > 0) {
        try {
          await rooms.chatRead(id: widget.roomId);
        } catch (_) {
          // Read again next time.
        }
      }
    } catch (error) {
      if (!mounted || quiet) return;
      setState(() => _error = error);
    }
  }

  void _toEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
    });
  }

  Future<void> _send(SendChatMessageDto body) async {
    if (_busy) return;
    final t = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    try {
      final sent =
          (await ref
                  .read(apiProvider)
                  .getRoomsApi()
                  .chatSend(id: widget.roomId, sendChatMessageDto: body))
              .data!;
      if (!mounted) return;
      setState(() {
        if (!_messages.any((m) => m.id == sent.id)) _messages = [..._messages, sent];
        if (body.text != null) _text.clear();
      });
      _toEnd();
    } catch (error) {
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(errorText(t, error))));
      final code = ApiError.from(error).code;
      if (code == 'CHAT_MUTED' || code == 'ROOM_ARCHIVED') unawaited(_load());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _report(ChatMessageDto message) async {
    final t = AppLocalizations.of(context);
    final reason = await showModalBottomSheet<ReportChatDtoReasonEnum>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => _ReportSheet(message: message),
    );
    if (reason == null || !mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(apiProvider)
          .getRoomsApi()
          .chatReport(
            id: widget.roomId,
            reportChatDto: ReportChatDto(messageId: message.id, reason: reason),
          );
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(t.roomReported)));
    } catch (error) {
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(errorText(t, error))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final room = _room;
    final auth = ref.watch(authControllerProvider);
    final myId = widget.childId ?? (auth is SignedIn ? auth.me.id : null);
    if (room == null) {
      return Scaffold(
        appBar: AppBar(title: Text(t.roomsTitle)),
        body: _error != null ? ErrorView(error: _error!, onRetry: _load) : const LoadingView(),
      );
    }
    final canSend = _member && !room.archived && room.mutedUntil == null;
    final localizations = MaterialLocalizations.of(context);
    String time(DateTime at) {
      final local = at.toLocal();
      final now = DateTime.now();
      final clock = localizations.formatTimeOfDay(TimeOfDay.fromDateTime(local));
      return local.year == now.year && local.month == now.month && local.day == now.day
          ? clock
          : '${localizations.formatShortMonthDay(local)} $clock';
    }

    return Scaffold(
      appBar: AppBar(title: Text(room.name)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                KcpIcon('shield', size: 18, color: p.brandText),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _member ? t.roomSafety : t.roomParentSafety,
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _messages.isEmpty
                ? Center(child: Text(t.roomEmpty, style: theme.textTheme.bodyMedium))
                : Semantics(
                    liveRegion: true,
                    label: t.roomMessagesLabel(room.name),
                    child: ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        final message = _messages[index];
                        return _MessageRow(
                          message: message,
                          mine: message.author.id == myId,
                          time: time(message.createdAt),
                          onReport: _member && message.author.id != myId && !message.hidden
                              ? () => _report(message)
                              : null,
                        );
                      },
                    ),
                  ),
          ),
          if (_member)
            SafeArea(
              top: false,
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: p.surface,
                  border: Border(top: BorderSide(color: p.line)),
                ),
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                child: room.archived
                    ? Text(t.roomArchived)
                    : room.mutedUntil != null
                    ? Text(
                        t.roomMuted(
                          '${localizations.formatMediumDate(room.mutedUntil!.toLocal())} '
                          '${localizations.formatTimeOfDay(TimeOfDay.fromDateTime(room.mutedUntil!.toLocal()))}',
                        ),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            height: 44,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: roomPhrases.length,
                              separatorBuilder: (_, _) => const SizedBox(width: 8),
                              itemBuilder: (context, index) {
                                final phrase = roomPhrases[index];
                                return ActionChip(
                                  label: Text(roomPhraseText(t, phrase.value)),
                                  onPressed: canSend && !_busy
                                      ? () => _send(SendChatMessageDto(phrase: phrase))
                                      : null,
                                );
                              },
                            ),
                          ),
                          const SizedBox(height: 8),
                          if (room.canType)
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _text,
                                    maxLength: 300,
                                    textInputAction: TextInputAction.send,
                                    decoration: InputDecoration(
                                      labelText: t.roomTypeLabel,
                                      counterText: '',
                                    ),
                                    onSubmitted: (value) {
                                      if (value.trim().isNotEmpty) {
                                        _send(SendChatMessageDto(text: value.trim()));
                                      }
                                    },
                                  ),
                                ),
                                const SizedBox(width: 8),
                                IconButton.filled(
                                  tooltip: t.roomSend,
                                  onPressed: _busy
                                      ? null
                                      : () {
                                          final value = _text.text.trim();
                                          if (value.isNotEmpty) {
                                            _send(SendChatMessageDto(text: value));
                                          }
                                        },
                                  icon: const KcpIcon('send', size: 20),
                                ),
                              ],
                            )
                          else
                            Text(t.roomPhrasesOnly, style: theme.textTheme.bodySmall),
                        ],
                      ),
              ),
            ),
        ],
      ),
    );
  }
}

class _MessageRow extends StatelessWidget {
  const _MessageRow({
    required this.message,
    required this.mine,
    required this.time,
    required this.onReport,
  });

  final ChatMessageDto message;
  final bool mine;
  final String time;
  final VoidCallback? onReport;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final text = message.hidden
        ? t.roomRemoved
        : message.kind == ChatMessageDtoKindEnum.PHRASE
        ? roomPhraseText(t, message.phraseKey)
        : message.text ?? '';
    final avatar = message.author.avatarKey != null
        ? KcpAvatar(message.author.avatarKey!, size: 32)
        : IconDisc('graduation', size: 32, background: p.sage200, color: p.sageText);
    final bubble = Flexible(
      child: Column(
        crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Text(
            [
              mine ? t.roomYou : message.author.name,
              if (message.author.isAdult) t.roomAdult,
              time,
            ].join(' · '),
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 2),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: message.hidden
                  ? Colors.transparent
                  : mine
                  ? p.brand
                  : p.sage100,
              border: message.hidden ? Border.all(color: p.line) : null,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              text,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: message.hidden ? p.muted : (mine ? p.onPrimary : p.ink),
                fontStyle: message.hidden ? FontStyle.italic : null,
              ),
            ),
          ),
        ],
      ),
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: mine
            ? [bubble, const SizedBox(width: 8), avatar]
            : [
                avatar,
                const SizedBox(width: 8),
                bubble,
                if (onReport != null)
                  IconButton(
                    tooltip: t.roomReportMessage(message.author.name),
                    onPressed: onReport,
                    icon: KcpIcon('flag', size: 18, color: p.muted),
                  ),
              ],
      ),
    );
  }
}

class _ReportSheet extends StatefulWidget {
  const _ReportSheet({required this.message});

  final ChatMessageDto message;

  @override
  State<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<_ReportSheet> {
  ReportChatDtoReasonEnum _reason = ReportChatDtoReasonEnum.UNKIND;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(t.roomReportTitle, style: theme.textTheme.titleLarge),
            ),
            const SizedBox(height: 6),
            Text(t.roomReportIntro, style: theme.textTheme.bodySmall),
            const SizedBox(height: 8),
            RadioGroup<ReportChatDtoReasonEnum>(
              groupValue: _reason,
              onChanged: (value) => setState(() => _reason = value ?? _reason),
              child: Column(
                children: [
                  for (final reason in roomReportReasons)
                    RadioListTile<ReportChatDtoReasonEnum>(
                      value: reason,
                      contentPadding: EdgeInsets.zero,
                      title: Text(roomReasonText(t, reason)),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).pop(_reason),
              icon: const KcpIcon('flag', size: 18),
              label: Text(t.roomReportSend),
            ),
          ],
        ),
      ),
    );
  }
}

/// On the Me screen: the student's rooms, when they're in any.
class RoomsEntry extends ConsumerWidget {
  const RoomsEntry({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final rooms = ref.watch(roomsProvider).value;
    if (rooms == null || rooms.isEmpty) return const SizedBox.shrink();
    final unread = rooms.fold<int>(0, (sum, room) => sum + room.unread.toInt());
    final p = context.kcp;
    return Padding(
      padding: const EdgeInsets.only(top: 18),
      child: SectionCard(
        onTap: () async {
          await context.push('/rooms');
          ref.invalidate(roomsProvider);
        },
        child: MergeSemantics(
          child: Row(
            children: [
              IconDisc('msg', size: 44, background: p.brand100, color: p.brandText),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t.roomsTitle, style: Theme.of(context).textTheme.titleMedium),
                    Text(
                      unread > 0 ? t.roomUnread(unread) : t.roomsCount(rooms.length),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              KcpIcon('chevR', size: 18, color: p.muted),
            ],
          ),
        ),
      ),
    );
  }
}

/// On a child's screen, for their parent: the rooms they're in (read only).
class ChildRoomsCard extends ConsumerWidget {
  const ChildRoomsCard({super.key, required this.childId});

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final rooms = ref.watch(childRoomsProvider(childId)).value;
    if (rooms == null || rooms.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: SectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(t.childRoomsTitle, style: Theme.of(context).textTheme.titleMedium),
            ),
            const SizedBox(height: 4),
            Text(t.childRoomsIntro, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 10),
            for (final room in rooms)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: RoomTile(
                  room: ChatRoomDto(
                    id: room.id,
                    kind: room.kind,
                    name: room.name,
                    unread: 0,
                    lastMessageAt: room.lastMessageAt,
                    canType: false,
                    mutedUntil: null,
                    archived: room.archived,
                  ),
                  onTap: () => context.push('/parent/child/$childId/rooms/${room.id}'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
