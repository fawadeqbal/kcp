import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import 'kcp_icon.dart';

/// The twelve pictures of picture passwords (packages/shared PICTURE_KEYS), each
/// on its own colour as on the web, so children can find them by colour as well as
/// shape. The tiles keep dark ink in dark mode too: they are pictures.
const pictureColours = <String, Color>{
  'cat': Color(0xFFFCD9B6),
  'dog': Color(0xFFE8D8C3),
  'fish': Color(0xFFC7E5F7),
  'bird': Color(0xFFD3EEC6),
  'rabbit': Color(0xFFF1D4EA),
  'sun': Color(0xFFFDEB96),
  'moon': Color(0xFFD9D9F6),
  'star': Color(0xFFFFE39A),
  'tree': Color(0xFFC8E6D0),
  'flower': Color(0xFFF8D0DA),
  'apple': Color(0xFFF9CDC4),
  'car': Color(0xFFD0E1F6),
};

List<String> get pictureKeys => pictureColours.keys.toList();

/// How many pictures a picture password has.
const picturePasswordLength = 4;

String pictureName(AppLocalizations t, String picture) => switch (picture) {
  'cat' => t.pictureCat,
  'dog' => t.pictureDog,
  'fish' => t.pictureFish,
  'bird' => t.pictureBird,
  'rabbit' => t.pictureRabbit,
  'sun' => t.pictureSun,
  'moon' => t.pictureMoon,
  'star' => t.pictureStar,
  'tree' => t.pictureTree,
  'flower' => t.pictureFlower,
  'apple' => t.pictureApple,
  'car' => t.pictureCar,
  _ => picture,
};

class PictureTile extends StatelessWidget {
  const PictureTile(this.picture, {super.key, this.size = 64});

  final String picture;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: pictureColours[picture],
        borderRadius: BorderRadius.circular(KcpRadius.row),
      ),
      alignment: Alignment.center,
      child: KcpIcon(picture, size: size * 0.5, color: const Color(0xFF201E1D)),
    );
  }
}

/// The twelve pictures to tap, four to a row, with their names for screen readers.
/// The order never changes, also in Arabic and Urdu, so a child's picture password
/// looks the same everywhere.
class PicturePad extends StatelessWidget {
  const PicturePad({super.key, required this.onPick, this.enabled = true});

  final ValueChanged<String> onPick;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Directionality(
      textDirection: TextDirection.ltr,
      child: LayoutBuilder(
        builder: (context, constraints) {
          const gap = 10.0;
          final size = ((constraints.maxWidth - gap * 3) / 4).clamp(48.0, 96.0);
          return Wrap(
            spacing: gap,
            runSpacing: gap,
            children: [
              for (final picture in pictureKeys)
                Semantics(
                  button: true,
                  enabled: enabled,
                  label: pictureName(t, picture),
                  excludeSemantics: true,
                  child: Opacity(
                    opacity: enabled ? 1 : 0.5,
                    child: Material(
                      type: MaterialType.transparency,
                      child: InkWell(
                        key: ValueKey('picture-$picture'),
                        borderRadius: BorderRadius.circular(KcpRadius.row),
                        onTap: enabled ? () => onPick(picture) : null,
                        child: PictureTile(picture, size: size),
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

/// The pictures picked so far (as dots for the ones still to pick), and undo.
class PickedPictures extends StatelessWidget {
  const PickedPictures({super.key, required this.picked, required this.onUndo});

  final List<String> picked;
  final VoidCallback onUndo;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final p = context.kcp;
    return Row(
      children: [
        Semantics(
          label: t.loginPicturesPicked(picked.length),
          liveRegion: true,
          excludeSemantics: true,
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: Row(
              children: [
                for (var i = 0; i < picturePasswordLength; i++) ...[
                  if (i < picked.length)
                    PictureTile(picked[i], size: 40)
                  else
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        border: Border.all(color: p.line, width: 2),
                        borderRadius: BorderRadius.circular(KcpRadius.row),
                      ),
                    ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),
        ),
        const Spacer(),
        if (picked.isNotEmpty)
          TextButton.icon(
            onPressed: onUndo,
            icon: const KcpIcon('undo', size: 18),
            label: Text(t.loginPictureUndo),
          ),
      ],
    );
  }
}
