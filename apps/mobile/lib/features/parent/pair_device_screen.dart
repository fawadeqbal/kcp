import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import 'parent_data.dart';

/// "K7MQ 4xpr" → "K7MQ4XPR" (packages/shared normalizePairingCode).
String normalizePairingCode(String value) =>
    value.toUpperCase().replaceAll(RegExp('[^0-9A-Z]'), '');

const pairingCodeLength = 8;

/// "Sign in your child's device": the parent types the code the child's device
/// shows (or opens the QR code, which brings the code), sees which device asked,
/// and picks the child who uses it. The device then signs in by itself.
class PairDeviceScreen extends ConsumerStatefulWidget {
  const PairDeviceScreen({super.key, this.code});

  /// From a scanned QR code (the website's /pair?code= link).
  final String? code;

  @override
  ConsumerState<PairDeviceScreen> createState() => _PairDeviceScreenState();
}

class _PairDeviceScreenState extends ConsumerState<PairDeviceScreen> {
  late final _code = TextEditingController(text: widget.code ?? '');
  PairingInfoDto? _info;
  ChildDto? _done;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (normalizePairingCode(_code.text).length == pairingCodeLength) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _lookup());
    }
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _lookup() async {
    final code = normalizePairingCode(_code.text);
    final t = AppLocalizations.of(context);
    if (code.isEmpty) {
      setState(() => _error = t.fieldRequired);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final response = await ref
          .read(apiProvider)
          .getAuthApi()
          .authPairingInfo(pairingCodeDto: PairingCodeDto(code: code));
      if (mounted) setState(() => _info = response.data);
    } catch (error) {
      if (mounted) setState(() => _error = errorText(t, error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _approve(ChildDto child) async {
    final t = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(apiProvider)
          .getAuthApi()
          .authApprovePairing(
            pairingApproveDto: PairingApproveDto(
              code: normalizePairingCode(_code.text),
              childId: child.id,
            ),
          );
      if (mounted) setState(() => _done = child);
    } catch (error) {
      if (mounted) setState(() => _error = errorText(t, error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final children = ref.watch(childrenProvider);
    final info = _info;
    final done = _done;
    return Scaffold(
      appBar: AppBar(title: Text(t.parentPairTitle)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            if (done != null)
              Semantics(
                liveRegion: true,
                child: SectionCard(
                  color: p.sage100,
                  child: Row(
                    children: [
                      KcpIcon('check', size: 22, color: p.sage800),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          t.parentPairDone(done.nickname),
                          style: TextStyle(color: p.sage800, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else if (info != null) ...[
              SectionCard(
                color: p.raised,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t.parentPairDevice(info.device),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(t.parentPairWarning, style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Semantics(
                header: true,
                child: Text(t.parentPairWho, style: theme.textTheme.titleLarge),
              ),
              const SizedBox(height: 12),
              switch (children) {
                AsyncData(:final value) when value.isEmpty => Text(t.parentPairNoChildren),
                AsyncData(:final value) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final child in value) ...[
                      OutlinedButton(
                        onPressed: _busy ? null : () => _approve(child),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          alignment: AlignmentDirectional.centerStart,
                        ),
                        child: Row(
                          children: [
                            KcpAvatar(child.avatarKey, size: 36),
                            const SizedBox(width: 12),
                            Expanded(child: Text(t.parentPairApprove(child.nickname))),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],
                  ],
                ),
                AsyncError(:final error) => ErrorView(
                  error: error,
                  onRetry: () => ref.invalidate(childrenProvider),
                ),
                _ => const SizedBox(height: 120, child: LoadingView()),
              },
            ] else ...[
              Text(t.parentPairIntro),
              const SizedBox(height: 20),
              TextField(
                controller: _code,
                textDirection: TextDirection.ltr,
                textCapitalization: TextCapitalization.characters,
                autocorrect: false,
                enableSuggestions: false,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontFamily: 'monospace',
                  letterSpacing: 3,
                ),
                decoration: InputDecoration(labelText: t.parentPairCode, hintText: 'K7MQ 4XPR'),
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _lookup(),
              ),
              const SizedBox(height: 16),
              FilledButton(onPressed: _busy ? null : _lookup, child: Text(t.parentPairFind)),
            ],
            if (_error != null) ...[
              const SizedBox(height: 16),
              Semantics(
                liveRegion: true,
                child: SectionCard(
                  color: p.dangerSoft,
                  radius: KcpRadius.row,
                  padding: const EdgeInsets.all(14),
                  child: Text(_error!, style: TextStyle(color: p.dangerText)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
