import 'package:flutter/material.dart';

import '../theme/icons.g.dart';
import 'svg_path.dart';

/// An interface icon from the web apps' Lucide set (lib/theme/icons.g.dart), drawn with
/// the Organic system's round, heavy 2.75 stroke. It takes the icon theme's size and
/// colour unless given its own. Arrows and chevrons turn round in Arabic and Urdu.
/// Icons are decorative: the words next to them (or a tooltip) say what they mean.
class KcpIcon extends StatelessWidget {
  const KcpIcon(this.name, {super.key, this.size, this.color, this.semanticLabel});

  final String name;
  final double? size;
  final Color? color;

  /// Only for an icon that stands on its own.
  final String? semanticLabel;

  static final Map<String, List<Path>> _cache = {};

  static List<Path> pathsOf(String name) => _cache.putIfAbsent(
    name,
    () => (kcpIconPaths[name] ?? const <String>[]).map(parseSvgPath).toList(),
  );

  @override
  Widget build(BuildContext context) {
    final iconTheme = IconTheme.of(context);
    final side = size ?? iconTheme.size ?? 24;
    final mirrored =
        kcpDirectionalIcons.contains(name) && Directionality.of(context) == TextDirection.rtl;
    final painted = CustomPaint(
      size: Size.square(side),
      painter: _IconPainter(
        pathsOf(name),
        color ?? iconTheme.color ?? DefaultTextStyle.of(context).style.color ?? Colors.black,
        mirrored,
      ),
    );
    if (semanticLabel == null) return ExcludeSemantics(child: painted);
    return Semantics(
      label: semanticLabel,
      image: true,
      child: ExcludeSemantics(child: painted),
    );
  }
}

class _IconPainter extends CustomPainter {
  _IconPainter(this.paths, this.color, this.mirrored);

  final List<Path> paths;
  final Color color;
  final bool mirrored;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 24;
    canvas.save();
    if (mirrored) {
      canvas.translate(size.width, 0);
      canvas.scale(-1, 1);
    }
    canvas.scale(scale);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.75
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..isAntiAlias = true
      ..color = color;
    for (final path in paths) {
      canvas.drawPath(path, paint);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_IconPainter old) =>
      old.paths != paths || old.color != color || old.mirrored != mirrored;
}
