import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/common.dart';

/// Tell the team something: a problem, an idea, or something that felt unsafe.
class FeedbackScreen extends ConsumerStatefulWidget {
  const FeedbackScreen({super.key});

  @override
  ConsumerState<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends ConsumerState<FeedbackScreen> {
  final _message = TextEditingController();
  CreateFeedbackDtoKindEnum _kind = CreateFeedbackDtoKindEnum.BUG;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final t = AppLocalizations.of(context);
    final text = _message.text.trim();
    if (text.length < 3) {
      setState(() => _error = t.feedbackTooShort);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(apiProvider)
          .getFeedbackApi()
          .feedbackCreate(
            createFeedbackDto: CreateFeedbackDto(
              kind: _kind,
              message: text,
              pagePath: '/mobile-app',
              languageCode: ref.read(appLanguageProvider),
            ),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t.feedbackSent)));
      context.pop();
    } catch (error) {
      if (mounted) setState(() => _error = errorText(t, error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final kinds = {
      CreateFeedbackDtoKindEnum.BUG: t.feedbackBug,
      CreateFeedbackDtoKindEnum.IDEA: t.feedbackIdea,
      CreateFeedbackDtoKindEnum.SAFETY: t.feedbackSafety,
      CreateFeedbackDtoKindEnum.PRAISE: t.feedbackPraise,
      CreateFeedbackDtoKindEnum.OTHER: t.feedbackOther,
    };
    return Scaffold(
      appBar: AppBar(title: Text(t.feedbackTitle)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(t.feedbackIntro),
          const SizedBox(height: 16),
          RadioGroup<CreateFeedbackDtoKindEnum>(
            groupValue: _kind,
            onChanged: (value) => setState(() => _kind = value ?? _kind),
            child: Column(
              children: [
                for (final entry in kinds.entries)
                  RadioListTile(value: entry.key, title: Text(entry.value)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _message,
            minLines: 4,
            maxLines: 8,
            maxLength: 2000,
            decoration: InputDecoration(labelText: t.feedbackMessage, errorText: _error),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy ? null : _send,
            child: Text(_busy ? t.sending : t.feedbackSend),
          ),
        ],
      ),
    );
  }
}
