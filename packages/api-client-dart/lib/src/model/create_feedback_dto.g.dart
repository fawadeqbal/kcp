// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_feedback_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$CreateFeedbackDtoCWProxy {
  CreateFeedbackDto kind(CreateFeedbackDtoKindEnum kind);

  CreateFeedbackDto message(String message);

  CreateFeedbackDto pagePath(String? pagePath);

  CreateFeedbackDto languageCode(String? languageCode);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `CreateFeedbackDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// CreateFeedbackDto(...).copyWith(id: 12, name: "My name")
  /// ````
  CreateFeedbackDto call({
    CreateFeedbackDtoKindEnum kind,
    String message,
    String? pagePath,
    String? languageCode,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfCreateFeedbackDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfCreateFeedbackDto.copyWith.fieldName(...)`
class _$CreateFeedbackDtoCWProxyImpl implements _$CreateFeedbackDtoCWProxy {
  const _$CreateFeedbackDtoCWProxyImpl(this._value);

  final CreateFeedbackDto _value;

  @override
  CreateFeedbackDto kind(CreateFeedbackDtoKindEnum kind) => this(kind: kind);

  @override
  CreateFeedbackDto message(String message) => this(message: message);

  @override
  CreateFeedbackDto pagePath(String? pagePath) => this(pagePath: pagePath);

  @override
  CreateFeedbackDto languageCode(String? languageCode) =>
      this(languageCode: languageCode);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `CreateFeedbackDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// CreateFeedbackDto(...).copyWith(id: 12, name: "My name")
  /// ````
  CreateFeedbackDto call({
    Object? kind = const $CopyWithPlaceholder(),
    Object? message = const $CopyWithPlaceholder(),
    Object? pagePath = const $CopyWithPlaceholder(),
    Object? languageCode = const $CopyWithPlaceholder(),
  }) {
    return CreateFeedbackDto(
      kind: kind == const $CopyWithPlaceholder()
          ? _value.kind
          // ignore: cast_nullable_to_non_nullable
          : kind as CreateFeedbackDtoKindEnum,
      message: message == const $CopyWithPlaceholder()
          ? _value.message
          // ignore: cast_nullable_to_non_nullable
          : message as String,
      pagePath: pagePath == const $CopyWithPlaceholder()
          ? _value.pagePath
          // ignore: cast_nullable_to_non_nullable
          : pagePath as String?,
      languageCode: languageCode == const $CopyWithPlaceholder()
          ? _value.languageCode
          // ignore: cast_nullable_to_non_nullable
          : languageCode as String?,
    );
  }
}

extension $CreateFeedbackDtoCopyWith on CreateFeedbackDto {
  /// Returns a callable class that can be used as follows: `instanceOfCreateFeedbackDto.copyWith(...)` or like so:`instanceOfCreateFeedbackDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$CreateFeedbackDtoCWProxy get copyWith =>
      _$CreateFeedbackDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CreateFeedbackDto _$CreateFeedbackDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('CreateFeedbackDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['kind', 'message']);
      final val = CreateFeedbackDto(
        kind: $checkedConvert(
          'kind',
          (v) => $enumDecode(
            _$CreateFeedbackDtoKindEnumEnumMap,
            v,
            unknownValue: CreateFeedbackDtoKindEnum.unknownDefaultOpenApi,
          ),
        ),
        message: $checkedConvert('message', (v) => v as String),
        pagePath: $checkedConvert('pagePath', (v) => v as String?),
        languageCode: $checkedConvert('languageCode', (v) => v as String?),
      );
      return val;
    });

Map<String, dynamic> _$CreateFeedbackDtoToJson(CreateFeedbackDto instance) =>
    <String, dynamic>{
      'kind': _$CreateFeedbackDtoKindEnumEnumMap[instance.kind]!,
      'message': instance.message,
      'pagePath': ?instance.pagePath,
      'languageCode': ?instance.languageCode,
    };

const _$CreateFeedbackDtoKindEnumEnumMap = {
  CreateFeedbackDtoKindEnum.SAFETY: 'SAFETY',
  CreateFeedbackDtoKindEnum.BUG: 'BUG',
  CreateFeedbackDtoKindEnum.IDEA: 'IDEA',
  CreateFeedbackDtoKindEnum.PRAISE: 'PRAISE',
  CreateFeedbackDtoKindEnum.OTHER: 'OTHER',
  CreateFeedbackDtoKindEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
