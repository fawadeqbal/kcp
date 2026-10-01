// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'save_project_draft_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SaveProjectDraftDtoCWProxy {
  SaveProjectDraftDto code(CodeFilesDto code);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SaveProjectDraftDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SaveProjectDraftDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SaveProjectDraftDto call({CodeFilesDto code});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfSaveProjectDraftDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfSaveProjectDraftDto.copyWith.fieldName(...)`
class _$SaveProjectDraftDtoCWProxyImpl implements _$SaveProjectDraftDtoCWProxy {
  const _$SaveProjectDraftDtoCWProxyImpl(this._value);

  final SaveProjectDraftDto _value;

  @override
  SaveProjectDraftDto code(CodeFilesDto code) => this(code: code);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SaveProjectDraftDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SaveProjectDraftDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SaveProjectDraftDto call({Object? code = const $CopyWithPlaceholder()}) {
    return SaveProjectDraftDto(
      code: code == const $CopyWithPlaceholder()
          ? _value.code
          // ignore: cast_nullable_to_non_nullable
          : code as CodeFilesDto,
    );
  }
}

extension $SaveProjectDraftDtoCopyWith on SaveProjectDraftDto {
  /// Returns a callable class that can be used as follows: `instanceOfSaveProjectDraftDto.copyWith(...)` or like so:`instanceOfSaveProjectDraftDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SaveProjectDraftDtoCWProxy get copyWith =>
      _$SaveProjectDraftDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SaveProjectDraftDto _$SaveProjectDraftDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('SaveProjectDraftDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['code']);
      final val = SaveProjectDraftDto(
        code: $checkedConvert(
          'code',
          (v) => CodeFilesDto.fromJson(v as Map<String, dynamic>),
        ),
      );
      return val;
    });

Map<String, dynamic> _$SaveProjectDraftDtoToJson(
  SaveProjectDraftDto instance,
) => <String, dynamic>{'code': instance.code.toJson()};
