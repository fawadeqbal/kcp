import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../l10n/app_localizations.dart';

/// Makes the gate's questions repeatable in tests.
@visibleForTesting
Random parentalGateRandom = Random.secure();

/// Asks a question a grown-up answers easily and a young child doesn't (a
/// multiplication written in words), before anything leaves the app or changes the
/// account: store rules for children's apps (Google Play Families, Apple Kids).
Future<bool> passParentalGate(BuildContext context) async {
  final passed = await showDialog<bool>(
    context: context,
    builder: (_) => ParentalGateDialog(random: parentalGateRandom),
  );
  return passed ?? false;
}

/// Opens a web page in the browser, after the parental gate.
Future<void> openExternalLink(BuildContext context, Uri uri) async {
  if (!await passParentalGate(context)) return;
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

class ParentalGateDialog extends StatefulWidget {
  const ParentalGateDialog({super.key, required this.random});

  final Random random;

  @override
  State<ParentalGateDialog> createState() => _ParentalGateDialogState();
}

class _ParentalGateDialogState extends State<ParentalGateDialog> {
  static const _maxTries = 3;
  final _controller = TextEditingController();
  late int _a;
  late int _b;
  int _tries = 0;
  bool _wrong = false;

  @override
  void initState() {
    super.initState();
    _newQuestion();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// A number from 11 to 19 times one from 3 to 9, in words: easy for a grown-up,
  /// not a tap-through for a young child.
  void _newQuestion() {
    _a = 11 + widget.random.nextInt(9);
    _b = 3 + widget.random.nextInt(7);
    _controller.clear();
  }

  void _submit() {
    if (int.tryParse(_controller.text.trim()) == _a * _b) {
      Navigator.of(context).pop(true);
      return;
    }
    _tries++;
    if (_tries >= _maxTries) {
      Navigator.of(context).pop(false);
      return;
    }
    setState(() {
      _wrong = true;
      _newQuestion();
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final words = t.gateNumberWords.split(',');
    String word(int n) => n < words.length ? words[n].trim() : '$n';
    return AlertDialog(
      title: Text(t.gateTitle),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t.gateBody),
          const SizedBox(height: 16),
          Text(t.gateQuestion(word(_a), word(_b)), style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            autofocus: true,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            maxLength: 3,
            decoration: InputDecoration(
              labelText: t.gateAnswerLabel,
              errorText: _wrong ? t.gateWrong : null,
              counterText: '',
            ),
            onSubmitted: (_) => _submit(),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(false), child: Text(t.cancel)),
        FilledButton(onPressed: _submit, child: Text(t.gateContinue)),
      ],
    );
  }
}
