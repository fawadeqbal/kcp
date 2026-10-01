// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'save_draft_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SaveDraftDtoCWProxy {
  SaveDraftDto code(CodeFilesDto code);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SaveDraftDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SaveDraftDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SaveDraftDto call({CodeFilesDto code});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfSaveDraftDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfSaveDraftDto.copyWith.fieldName(...)`
class _$SaveDraftDtoCWProxyImpl implements _$SaveDraftDtoCWProxy {
  const _$SaveDraftDtoCWProxyImpl(this._value);

  final SaveDraftDto _value;

  @override
  SaveDraftDto code(CodeFilesDto code) => this(code: code);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SaveDraftDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SaveDraftDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SaveDraftDto call({Object? code = const $CopyWithPlaceholder()}) {
    return SaveDraftDto(
      code: code == const $CopyWithPlaceholder()
          ? _value.code
          // ignore: cast_nullable_to_non_nullable
          : code as CodeFilesDto,
    );
  }
}

extension $SaveDraftDtoCopyWith on SaveDraftDto {
  /// Returns a callable class that can be used as follows: `instanceOfSaveDraftDto.copyWith(...)` or like so:`instanceOfSaveDraftDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SaveDraftDtoCWProxy get copyWith => _$SaveDraftDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SaveDraftDto _$SaveDraftDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('SaveDraftDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['code']);
      final val = SaveDraftDto(
        code: $checkedConvert(
          'code',
          (v) => CodeFilesDto.fromJson(v as Map<String, dynamic>),
        ),
      );
      return val;
    });

Map<String, dynamic> _$SaveDraftDtoToJson(SaveDraftDto instance) =>
    <String, dynamic>{'code': instance.code.toJson()};
