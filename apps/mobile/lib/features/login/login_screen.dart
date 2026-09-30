import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/auth_controller.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';

/// Sign-in for students (login name from their parent) or parents (email).
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key, required this.parent});

  /// True for parents (email), false for students (login name).
  final bool parent;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
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
    return Scaffold(
      appBar: AppBar(title: Text(widget.parent ? t.loginParentTitle : t.loginStudentTitle)),
      body: SafeArea(
        child: Form(
          key: _form,
          child: AutofillGroup(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
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
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Semantics(
                    liveRegion: true,
                    child: SectionCard(
                      color: context.kcp.dangerSoft,
                      radius: KcpRadius.row,
                      padding: const EdgeInsets.all(14),
                      child: Text(_error!, style: TextStyle(color: context.kcp.dangerText)),
                    ),
                  ),
                ],
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
        ),
      ),
    );
  }
}
