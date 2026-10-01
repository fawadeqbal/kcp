// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'code_files_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$CodeFilesDtoCWProxy {
  CodeFilesDto html(String? html);

  CodeFilesDto css(String? css);

  CodeFilesDto js(String? js);

  CodeFilesDto py(String? py);

  CodeFilesDto blocks(String? blocks);

  CodeFilesDto git(String? git);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `CodeFilesDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// CodeFilesDto(...).copyWith(id: 12, name: "My name")
  /// ````
  CodeFilesDto call({
    String? html,
    String? css,
    String? js,
    String? py,
    String? blocks,
    String? git,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfCodeFilesDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfCodeFilesDto.copyWith.fieldName(...)`
class _$CodeFilesDtoCWProxyImpl implements _$CodeFilesDtoCWProxy {
  const _$CodeFilesDtoCWProxyImpl(this._value);

  final CodeFilesDto _value;

  @override
  CodeFilesDto html(String? html) => this(html: html);

  @override
  CodeFilesDto css(String? css) => this(css: css);

  @override
  CodeFilesDto js(String? js) => this(js: js);

  @override
  CodeFilesDto py(String? py) => this(py: py);

  @override
  CodeFilesDto blocks(String? blocks) => this(blocks: blocks);

  @override
  CodeFilesDto git(String? git) => this(git: git);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `CodeFilesDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// CodeFilesDto(...).copyWith(id: 12, name: "My name")
  /// ````
  CodeFilesDto call({
    Object? html = const $CopyWithPlaceholder(),
    Object? css = const $CopyWithPlaceholder(),
    Object? js = const $CopyWithPlaceholder(),
    Object? py = const $CopyWithPlaceholder(),
    Object? blocks = const $CopyWithPlaceholder(),
    Object? git = const $CopyWithPlaceholder(),
  }) {
    return CodeFilesDto(
      html: html == const $CopyWithPlaceholder()
          ? _value.html
          // ignore: cast_nullable_to_non_nullable
          : html as String?,
      css: css == const $CopyWithPlaceholder()
          ? _value.css
          // ignore: cast_nullable_to_non_nullable
          : css as String?,
      js: js == const $CopyWithPlaceholder()
          ? _value.js
          // ignore: cast_nullable_to_non_nullable
          : js as String?,
      py: py == const $CopyWithPlaceholder()
          ? _value.py
          // ignore: cast_nullable_to_non_nullable
          : py as String?,
      blocks: blocks == const $CopyWithPlaceholder()
          ? _value.blocks
          // ignore: cast_nullable_to_non_nullable
          : blocks as String?,
      git: git == const $CopyWithPlaceholder()
          ? _value.git
          // ignore: cast_nullable_to_non_nullable
          : git as String?,
    );
  }
}

extension $CodeFilesDtoCopyWith on CodeFilesDto {
  /// Returns a callable class that can be used as follows: `instanceOfCodeFilesDto.copyWith(...)` or like so:`instanceOfCodeFilesDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$CodeFilesDtoCWProxy get copyWith => _$CodeFilesDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CodeFilesDto _$CodeFilesDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('CodeFilesDto', json, ($checkedConvert) {
      final val = CodeFilesDto(
        html: $checkedConvert('html', (v) => v as String?),
        css: $checkedConvert('css', (v) => v as String?),
        js: $checkedConvert('js', (v) => v as String?),
        py: $checkedConvert('py', (v) => v as String?),
        blocks: $checkedConvert('blocks', (v) => v as String?),
        git: $checkedConvert('git', (v) => v as String?),
      );
      return val;
    });

Map<String, dynamic> _$CodeFilesDtoToJson(CodeFilesDto instance) =>
    <String, dynamic>{
      'html': ?instance.html,
      'css': ?instance.css,
      'js': ?instance.js,
      'py': ?instance.py,
      'blocks': ?instance.blocks,
      'git': ?instance.git,
    };
