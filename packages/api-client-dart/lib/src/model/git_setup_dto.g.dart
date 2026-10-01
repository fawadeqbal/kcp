// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'git_setup_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$GitSetupDtoCWProxy {
  GitSetupDto files(Map<String, String> files);

  GitSetupDto setup(List<Object>? setup);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `GitSetupDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// GitSetupDto(...).copyWith(id: 12, name: "My name")
  /// ````
  GitSetupDto call({Map<String, String> files, List<Object>? setup});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfGitSetupDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfGitSetupDto.copyWith.fieldName(...)`
class _$GitSetupDtoCWProxyImpl implements _$GitSetupDtoCWProxy {
  const _$GitSetupDtoCWProxyImpl(this._value);

  final GitSetupDto _value;

  @override
  GitSetupDto files(Map<String, String> files) => this(files: files);

  @override
  GitSetupDto setup(List<Object>? setup) => this(setup: setup);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `GitSetupDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// GitSetupDto(...).copyWith(id: 12, name: "My name")
  /// ````
  GitSetupDto call({
    Object? files = const $CopyWithPlaceholder(),
    Object? setup = const $CopyWithPlaceholder(),
  }) {
    return GitSetupDto(
      files: files == const $CopyWithPlaceholder()
          ? _value.files
          // ignore: cast_nullable_to_non_nullable
          : files as Map<String, String>,
      setup: setup == const $CopyWithPlaceholder()
          ? _value.setup
          // ignore: cast_nullable_to_non_nullable
          : setup as List<Object>?,
    );
  }
}

extension $GitSetupDtoCopyWith on GitSetupDto {
  /// Returns a callable class that can be used as follows: `instanceOfGitSetupDto.copyWith(...)` or like so:`instanceOfGitSetupDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$GitSetupDtoCWProxy get copyWith => _$GitSetupDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

GitSetupDto _$GitSetupDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('GitSetupDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['files']);
      final val = GitSetupDto(
        files: $checkedConvert(
          'files',
          (v) => Map<String, String>.from(v as Map),
        ),
        setup: $checkedConvert(
          'setup',
          (v) => (v as List<dynamic>?)?.map((e) => e as Object).toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$GitSetupDtoToJson(GitSetupDto instance) =>
    <String, dynamic>{'files': instance.files, 'setup': ?instance.setup};
