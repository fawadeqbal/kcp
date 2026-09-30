import 'dart:ui';

/// Turns SVG path data ("M5 12h14", arcs and all) into a [Path]. Enough of SVG for the
/// app's icons and avatars, which come from the web apps' SVGs (tool/shared.mjs).
Path parseSvgPath(String data) => _SvgPathParser(data).parse();

class _SvgPathParser {
  _SvgPathParser(this.data);

  final String data;
  final Path path = Path();
  int _i = 0;
  double _x = 0, _y = 0; // the current point
  double _startX = 0, _startY = 0; // where the subpath began
  double? _controlX, _controlY; // the last curve's second control point (for S and T)

  Path parse() {
    String? command;
    while (true) {
      _skipSeparators();
      if (_i >= data.length) break;
      final char = data[_i];
      if (_isCommand(char)) {
        command = char;
        _i++;
      } else if (command == null) {
        throw FormatException('Path data must start with a command', data, _i);
      } else if (command == 'M') {
        command = 'L'; // Numbers after a move draw lines.
      } else if (command == 'm') {
        command = 'l';
      }
      _run(command);
    }
    return path;
  }

  void _run(String command) {
    final relative = command == command.toLowerCase();
    final dx = relative ? _x : 0.0;
    final dy = relative ? _y : 0.0;
    switch (command.toUpperCase()) {
      case 'M':
        _x = dx + _number();
        _y = dy + _number();
        _startX = _x;
        _startY = _y;
        path.moveTo(_x, _y);
        _controlX = null;
      case 'L':
        _x = dx + _number();
        _y = dy + _number();
        path.lineTo(_x, _y);
        _controlX = null;
      case 'H':
        _x = dx + _number();
        path.lineTo(_x, _y);
        _controlX = null;
      case 'V':
        _y = dy + _number();
        path.lineTo(_x, _y);
        _controlX = null;
      case 'C':
        final x1 = dx + _number(), y1 = dy + _number();
        final x2 = dx + _number(), y2 = dy + _number();
        _x = dx + _number();
        _y = dy + _number();
        path.cubicTo(x1, y1, x2, y2, _x, _y);
        _controlX = x2;
        _controlY = y2;
      case 'S':
        // The first control point mirrors the previous curve's second one.
        final x1 = _controlX == null ? _x : 2 * _x - _controlX!;
        final y1 = _controlY == null ? _y : 2 * _y - _controlY!;
        final x2 = dx + _number(), y2 = dy + _number();
        _x = dx + _number();
        _y = dy + _number();
        path.cubicTo(x1, y1, x2, y2, _x, _y);
        _controlX = x2;
        _controlY = y2;
      case 'Q':
        final x1 = dx + _number(), y1 = dy + _number();
        _x = dx + _number();
        _y = dy + _number();
        path.quadraticBezierTo(x1, y1, _x, _y);
        _controlX = x1;
        _controlY = y1;
      case 'T':
        final x1 = _controlX == null ? _x : 2 * _x - _controlX!;
        final y1 = _controlY == null ? _y : 2 * _y - _controlY!;
        _x = dx + _number();
        _y = dy + _number();
        path.quadraticBezierTo(x1, y1, _x, _y);
        _controlX = x1;
        _controlY = y1;
      case 'A':
        final rx = _number().abs(), ry = _number().abs();
        final rotation = _number();
        final largeArc = _flag();
        final sweep = _flag();
        _x = dx + _number();
        _y = dy + _number();
        if (rx == 0 || ry == 0) {
          path.lineTo(_x, _y);
        } else {
          // SVG's sweep flag 1 turns clockwise on screen (y points down).
          path.arcToPoint(
            Offset(_x, _y),
            radius: Radius.elliptical(rx, ry),
            rotation: rotation,
            largeArc: largeArc,
            clockwise: sweep,
          );
        }
        _controlX = null;
      case 'Z':
        path.close();
        _x = _startX;
        _y = _startY;
        _controlX = null;
      default:
        throw FormatException('Unknown path command $command', data, _i);
    }
  }

  static bool _isCommand(String char) => 'MmLlHhVvCcSsQqTtAaZz'.contains(char);

  void _skipSeparators() {
    while (_i < data.length &&
        (data[_i] == ' ' || data[_i] == ',' || data[_i] == '\n' || data[_i] == '\t')) {
      _i++;
    }
  }

  static final _numberPattern = RegExp(r'[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?');

  double _number() {
    _skipSeparators();
    final match = _numberPattern.matchAsPrefix(data, _i);
    if (match == null) throw FormatException('Expected a number', data, _i);
    _i = match.end;
    return double.parse(match[0]!);
  }

  /// An arc flag: a single 0 or 1, which may be written with no space after it.
  bool _flag() {
    _skipSeparators();
    if (_i >= data.length || (data[_i] != '0' && data[_i] != '1')) {
      throw FormatException('Expected an arc flag', data, _i);
    }
    return data[_i++] == '1';
  }
}
