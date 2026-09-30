import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'svg_path.dart';

/*
 * Preset avatars: a white picture on a coloured circle, drawn on a 48×48 grid, the same
 * pictures as the web apps (packages/ui/src/avatar.tsx). Children never upload photos,
 * so these are the only pictures of a child anywhere.
 */

/// One shape of an avatar picture.
sealed class _Shape {
  const _Shape({this.onBackground = false, this.opacity = 1});

  /// Painted in the circle's colour (a cut-out), not white.
  final bool onBackground;
  final double opacity;
}

class _Fill extends _Shape {
  const _Fill(this.d, {super.onBackground, super.opacity});
  final String d;
}

class _Stroke extends _Shape {
  const _Stroke(this.d, this.width, {super.onBackground});
  final String d;
  final double width;
}

class _Circle extends _Shape {
  const _Circle(this.cx, this.cy, this.r, {super.onBackground});
  final double cx, cy, r;
}

class _Rect extends _Shape {
  const _Rect(this.x, this.y, this.width, this.height, this.radius, {super.onBackground});
  final double x, y, width, height, radius;
}

/// An ellipse's outline, turned by [degrees] around its centre.
class _Ring extends _Shape {
  const _Ring(this.cx, this.cy, this.rx, this.ry, this.degrees, this.width);
  final double cx, cy, rx, ry, degrees, width;
}

const Map<String, List<_Shape>> _art = {
  'rocket': [
    _Fill('M24 7c5.5 4.5 8 11 8 17.5V31H16v-6.5C16 18 18.5 11.5 24 7z'),
    _Circle(24, 19, 3.2, onBackground: true),
    _Fill('M16 24l-5 7.5V35h5zM32 24l5 7.5V35h-5z'),
    _Fill('M20.5 33h7L24 41z', opacity: 0.8),
  ],
  'star': [_Fill('M24 8l4.7 10.5 11.3 1.1-8.6 7.4 2.6 11-10-5.8-10 5.8 2.6-11L8 19.6l11.3-1.1z')],
  'bolt': [_Fill('M27 7L13 27h9l-3 14 16-21h-9z')],
  'planet': [_Circle(24, 24, 9), _Ring(24, 24, 17, 5.5, -24, 2.5)],
  'robot': [
    _Stroke('M24 16v-5', 2.5),
    _Circle(24, 10, 2.4),
    _Rect(13, 16, 22, 18, 4),
    _Rect(9.5, 21, 3.5, 8, 1.75),
    _Rect(35, 21, 3.5, 8, 1.75),
    _Circle(19, 24, 2.5, onBackground: true),
    _Circle(29, 24, 2.5, onBackground: true),
    _Rect(19, 29, 10, 2, 1, onBackground: true),
  ],
  'leaf': [
    _Fill('M37 10C21 10 11 18 11 29c0 5 3 9 3 9s3-1 8-1c11 0 16-10 15-27z'),
    _Stroke('M15 36c5-9 11-15 17-20', 2.2, onBackground: true),
  ],
  'moon': [_Fill('M30 9a15 15 0 1 0 9 24 12.5 12.5 0 0 1-9-24z'), _Circle(36, 13, 1.6)],
  'sun': [
    _Circle(24, 24, 7.5),
    _Stroke(
      'M24 8.5v4M24 35.5v4M8.5 24h4M35.5 24h4M13 13l2.8 2.8M32.2 32.2L35 35M13 35l2.8-2.8M32.2 15.8L35 13',
      3,
    ),
  ],
  'cube': [
    _Fill('M24 9l12.5 7L24 23l-12.5-7z'),
    _Fill('M11.5 18.5l11 6.2V39l-11-6.3z', opacity: 0.8),
    _Fill('M36.5 18.5v14.2l-11 6.3V24.7z', opacity: 0.6),
  ],
  'gamepad': [
    _Fill(
      'M15 16h18a7 7 0 0 1 6.9 5.9l1.5 9.4a4 4 0 0 1-7 3.2L31 30H17l-3.4 4.5a4 4 0 0 1-7-3.2l1.5-9.4A7 7 0 0 1 15 16z',
    ),
    _Fill('M15 20.5h2.5v3h3V26h-3v3H15v-3h-3v-2.5h3z', onBackground: true),
    _Circle(31, 22.5, 1.8, onBackground: true),
    _Circle(34.5, 26.5, 1.8, onBackground: true),
  ],
  'music': [
    _Fill('M19 13.5L36 9v20.5a4.8 4.8 0 1 1-2.6-4.3V15.2l-11.8 3.1v14.2a4.8 4.8 0 1 1-2.6-4.3z'),
  ],
  'code': [_Stroke('M17 15l-8 9 8 9M31 15l8 9-8 9M27 11l-6 26', 3.2)],
};

/// A preset avatar (decorative: the nickname is always shown next to it).
class KcpAvatar extends StatelessWidget {
  const KcpAvatar(this.avatarKey, {super.key, this.size = 48});

  final String avatarKey;
  final double size;

  @override
  Widget build(BuildContext context) {
    final key = _art.containsKey(avatarKey) ? avatarKey : 'rocket';
    return ExcludeSemantics(
      child: CustomPaint(
        size: Size.square(size),
        painter: _AvatarPainter(_art[key]!, kcpAvatarColors[key] ?? const Color(0xFF8C491A)),
      ),
    );
  }
}

class _AvatarPainter extends CustomPainter {
  _AvatarPainter(this.shapes, this.background);

  final List<_Shape> shapes;
  final Color background;

  static final Map<String, Path> _paths = {};
  static Path _path(String d) => _paths.putIfAbsent(d, () => parseSvgPath(d));

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 48);
    canvas.drawCircle(const Offset(24, 24), 24, Paint()..color = background);
    for (final shape in shapes) {
      final color = shape.onBackground ? background : Colors.white;
      final fill = Paint()
        ..color = color.withValues(alpha: shape.opacity)
        ..isAntiAlias = true;
      switch (shape) {
        case _Fill(:final d):
          canvas.drawPath(_path(d), fill);
        case _Circle(:final cx, :final cy, :final r):
          canvas.drawCircle(Offset(cx, cy), r, fill);
        case _Rect(:final x, :final y, :final width, :final height, :final radius):
          canvas.drawRRect(
            RRect.fromRectAndRadius(Rect.fromLTWH(x, y, width, height), Radius.circular(radius)),
            fill,
          );
        case _Stroke(:final d, :final width):
          canvas.drawPath(_path(d), _stroke(color, width));
        case _Ring(:final cx, :final cy, :final rx, :final ry, :final degrees, :final width):
          canvas.save();
          canvas.translate(cx, cy);
          canvas.rotate(degrees * 3.141592653589793 / 180);
          canvas.drawOval(
            Rect.fromCenter(center: Offset.zero, width: rx * 2, height: ry * 2),
            _stroke(color, width),
          );
          canvas.restore();
      }
    }
    canvas.restore();
  }

  static Paint _stroke(Color color, double width) => Paint()
    ..style = PaintingStyle.stroke
    ..strokeWidth = width
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round
    ..color = color
    ..isAntiAlias = true;

  @override
  bool shouldRepaint(_AvatarPainter old) => old.shapes != shapes || old.background != background;
}
