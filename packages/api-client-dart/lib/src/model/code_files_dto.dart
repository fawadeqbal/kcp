//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'code_files_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class CodeFilesDto {
  /// Returns a new [CodeFilesDto] instance.
  CodeFilesDto({this.html, this.css, this.js, this.py});

  @JsonKey(name: r'html', required: false, includeIfNull: false)
  final String? html;

  @JsonKey(name: r'css', required: false, includeIfNull: false)
  final String? css;

  @JsonKey(name: r'js', required: false, includeIfNull: false)
  final String? js;

  /// Python lessons: the program (runs with Pyodide in the sandbox).
  @JsonKey(name: r'py', required: false, includeIfNull: false)
  final String? py;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CodeFilesDto &&
          other.html == html &&
          other.css == css &&
          other.js == js &&
          other.py == py;

  @override
  int get hashCode => html.hashCode + css.hashCode + js.hashCode + py.hashCode;

  factory CodeFilesDto.fromJson(Map<String, dynamic> json) =>
      _$CodeFilesDtoFromJson(json);

  Map<String, dynamic> toJson() => _$CodeFilesDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
