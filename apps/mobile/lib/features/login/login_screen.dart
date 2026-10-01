import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../api/api_error.dart';
import '../../auth/auth_controller.dart';
import '../../config/app_config.dart';
import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/pictures.dart';

/// Sign-in for parents (email) or students: with the login name and password
/// their parent gave them, with a picture password (young children), or with a
/// parent's phone (the parent approves this device and picks the child).
class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key, required this.parent});

  /// True for parents (email), false for students.
  final bool parent;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    if (parent) {
      return Scaffold(
        appBar: AppBar(title: Text(t.loginParentTitle)),
        body: const SafeArea(child: _PasswordForm(parent: true)),
      );
    }
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Text(t.loginStudentTitle),
          bottom: TabBar(
            tabs: [
              Tab(text: t.loginTabPassword),
              Tab(text: t.loginTabPictures),
              Tab(text: t.loginTabPhone),
            ],
          ),
        ),
        body: const SafeArea(
          child: TabBarView(
            children: [_PasswordForm(parent: false), _PictureForm(), _PhonePairing()],
          ),
        ),
      ),
    );
  }
}

/// A sign-in error, read out when it appears.
class _ErrorCard extends StatelessWidget {
  const _ErrorCard(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: SectionCard(
        color: context.kcp.dangerSoft,
        radius: KcpRadius.row,
        padding: const EdgeInsets.all(14),
        child: Text(text, style: TextStyle(color: context.kcp.dangerText)),
      ),
    );
  }
}

class _PasswordForm extends ConsumerStatefulWidget {
  const _PasswordForm({required this.parent});

  final bool parent;

  @override
  ConsumerState<_PasswordForm> createState() => _PasswordFormState();
}

class _PasswordFormState extends ConsumerState<_PasswordForm> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _password = TextEditingController();
  bool _hidePassword = true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy || !(_form.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final auth = ref.read(authControllerProvider.notifier);
    try {
      if (widget.parent) {
        await auth.loginParent(_name.text, _password.text);
      } else {
        await auth.loginStudent(_name.text, _password.text);
      }
      // The router moves on once signed in.
    } catch (error) {
      if (mounted) setState(() => _error = errorText(AppLocalizations.of(context), error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Form(
      key: _form,
      child: AutofillGroup(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            Row(
              children: [
                IconDisc(
                  widget.parent ? 'users' : 'graduation',
                  size: 52,
                  background: widget.parent ? context.kcp.sage200 : context.kcp.brand100,
                  color: widget.parent ? context.kcp.sage800 : context.kcp.brandText,
                ),
                const SizedBox(width: 14),
                Expanded(child: Text(widget.parent ? t.loginParentBody : t.loginStudentBody)),
              ],
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: _name,
              textDirection: TextDirection.ltr,
              keyboardType: widget.parent ? TextInputType.emailAddress : TextInputType.text,
              autofillHints: [widget.parent ? AutofillHints.email : AutofillHints.username],
              autocorrect: false,
              enableSuggestions: false,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(
                labelText: widget.parent ? t.loginEmail : t.loginUsername,
                hintText: widget.parent ? null : 'swift-falcon-4821',
              ),
              validator: (value) => (value ?? '').trim().isEmpty ? t.fieldRequired : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _password,
              obscureText: _hidePassword,
              autofillHints: const [AutofillHints.password],
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                labelText: t.loginPassword,
                suffixIcon: IconButton(
                  tooltip: _hidePassword ? t.showPassword : t.hidePassword,
                  icon: KcpIcon(_hidePassword ? 'eye' : 'eyeOff', size: 20),
                  onPressed: () => setState(() => _hidePassword = !_hidePassword),
                ),
              ),
              validator: (value) => (value ?? '').isEmpty ? t.fieldRequired : null,
            ),
            if (_error != null) ...[const SizedBox(height: 16), _ErrorCard(_error!)],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: Text(_busy ? t.signingIn : t.signIn),
            ),
            const SizedBox(height: 16),
            Text(
              widget.parent ? t.loginParentForgot : t.loginStudentForgot,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

/// The login name, then four pictures in order: it signs in by itself after the
/// fourth one.
class _PictureForm extends ConsumerStatefulWidget {
  const _PictureForm();

  @override
  ConsumerState<_PictureForm> createState() => _PictureFormState();
}

class _PictureFormState extends ConsumerState<_PictureForm> {
  late final _name = TextEditingController(
    text: ref.read(authControllerProvider.notifier).lastStudent ?? '',
  );
  final List<String> _picked = [];
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _pick(String picture) async {
    if (_busy || _picked.length >= picturePasswordLength) return;
    setState(() {
      _picked.add(picture);
      _error = null;
    });
    if (_picked.length < picturePasswordLength) return;
    final t = AppLocalizations.of(context);
    if (_name.text.trim().isEmpty) {
      setState(() {
        _error = t.fieldRequired;
        _picked.clear();
      });
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(authControllerProvider.notifier).loginWithPictures(_name.text, [..._picked]);
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = ApiError.from(error).code == 'INVALID_CREDENTIALS'
              ? t.loginPictureWrong
              : errorText(t, error);
          _picked.clear();
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
        Text(t.loginPicturesIntro),
        const SizedBox(height: 16),
        TextField(
          controller: _name,
          textDirection: TextDirection.ltr,
          autofillHints: const [AutofillHints.username],
          autocorrect: false,
          enableSuggestions: false,
          decoration: InputDecoration(labelText: t.loginUsername, hintText: 'swift-falcon-4821'),
        ),
        const SizedBox(height: 20),
        Semantics(
          header: true,
          child: Text(t.loginTapPictures, style: Theme.of(context).textTheme.titleMedium),
        ),
        const SizedBox(height: 10),
        PickedPictures(picked: _picked, onUndo: () => setState(() => _picked.removeLast())),
        const SizedBox(height: 14),
        PicturePad(onPick: _pick, enabled: !_busy),
        if (_busy) ...[const SizedBox(height: 16), Text(t.signingIn, textAlign: TextAlign.center)],
        if (_error != null) ...[const SizedBox(height: 16), _ErrorCard(_error!)],
        const SizedBox(height: 16),
        Text(t.loginStudentForgot, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

/// How often the device asks whether the parent has approved it.
const pairingPollInterval = Duration(milliseconds: 2500);

/// "8 letters" → "K7MQ 4XPR": easier to read out and to type.
String spacedCode(String code) =>
    code.length == 8 ? '${code.substring(0, 4)} ${code.substring(4)}' : code;

/// The device shows a code (and a QR code of the website's /pair page); a parent
/// approves it on their phone and picks the child; the device then signs in.
class _PhonePairing extends ConsumerStatefulWidget {
  const _PhonePairing();

  @override
  ConsumerState<_PhonePairing> createState() => _PhonePairingState();
}

enum _PairingPhase { starting, waiting, approved, expired, failed }

class _PhonePairingState extends ConsumerState<_PhonePairing> {
  PairingStartedDto? _pairing;
  _PairingPhase _phase = _PairingPhase.starting;
  Object? _error;
  Timer? _poll;
  bool _asking = false;

  @override
  void initState() {
    super.initState();
    unawaited(_start());
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  /// A new code (the last one expired, or asking failed).
  void _restart() {
    _poll?.cancel();
    setState(() {
      _phase = _PairingPhase.starting;
      _error = null;
    });
    unawaited(_start());
  }

  Future<void> _start() async {
    try {
      final pairing = await ref.read(authControllerProvider.notifier).startPairing();
      if (!mounted) return;
      setState(() {
        _pairing = pairing;
        _phase = _PairingPhase.waiting;
      });
      _poll = Timer.periodic(pairingPollInterval, (_) => unawaited(_check()));
    } catch (error) {
      if (mounted) {
        setState(() {
          _phase = _PairingPhase.failed;
          _error = error;
        });
      }
    }
  }

  Future<void> _check() async {
    final pairing = _pairing;
    if (pairing == null || _asking || _phase != _PairingPhase.waiting) return;
    _asking = true;
    final auth = ref.read(authControllerProvider.notifier);
    try {
      final status = await auth.pairingStatus(pairing);
      if (!mounted) return;
      if (status == PairingStatusDtoStatusEnum.approved) {
        _poll?.cancel();
        setState(() => _phase = _PairingPhase.approved);
        await auth.claimPairing(pairing);
        // The router moves on once signed in.
      } else if (status == PairingStatusDtoStatusEnum.expired ||
          DateTime.now().isAfter(pairing.expiresAt)) {
        _poll?.cancel();
        setState(() => _phase = _PairingPhase.expired);
      }
    } catch (error) {
      if (!mounted) return;
      final apiError = ApiError.from(error);
      // Offline for a moment: keep asking. Anything else ends this code.
      if (!apiError.offline) {
        _poll?.cancel();
        setState(() {
          _phase = apiError.code == 'PAIRING_NOT_FOUND'
              ? _PairingPhase.expired
              : _PairingPhase.failed;
          _error = error;
        });
      }
    } finally {
      _asking = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final config = ref.watch(appConfigProvider);
    final language = ref.watch(appLanguageProvider);
    final pairing = _pairing;
    final pageUrl = config.webPage(language, '/pair');
    final address = '${pageUrl.host}${pageUrl.path}';
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
        Semantics(header: true, child: Text(t.pairTitle, style: theme.textTheme.titleLarge)),
        const SizedBox(height: 8),
        Text(t.pairBody(address)),
        const SizedBox(height: 20),
        switch (_phase) {
          _PairingPhase.starting => const SizedBox(height: 240, child: LoadingView()),
          _PairingPhase.failed => _ErrorCard(errorText(t, _error ?? '')),
          _PairingPhase.expired => SectionCard(
            color: p.raised,
            child: Text(t.pairExpired, textAlign: TextAlign.center),
          ),
          _PairingPhase.waiting || _PairingPhase.approved => Column(
            children: [
              Semantics(
                image: true,
                label: t.pairQr,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    // QR codes need dark on light, also in dark mode.
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(KcpRadius.well),
                  ),
                  child: QrImageView(
                    data: config
                        .webPage(language, '/pair')
                        .replace(queryParameters: {'code': pairing!.code})
                        .toString(),
                    size: 200,
                    backgroundColor: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(t.pairCode, style: theme.textTheme.bodySmall),
              Directionality(
                textDirection: TextDirection.ltr,
                child: SelectableText(
                  spacedCode(pairing.code),
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontFamily: 'monospace',
                    letterSpacing: 4,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Semantics(
                liveRegion: true,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2.5),
                    ),
                    const SizedBox(width: 10),
                    Flexible(
                      child: Text(
                        _phase == _PairingPhase.approved ? t.pairApproved : t.pairWaiting,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        },
        if (_phase == _PairingPhase.expired || _phase == _PairingPhase.failed) ...[
          const SizedBox(height: 16),
          FilledButton(onPressed: _restart, child: Text(t.pairNew)),
        ],
      ],
    );
  }
}
