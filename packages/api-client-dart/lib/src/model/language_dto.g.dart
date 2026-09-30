// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'language_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LanguageDtoCWProxy {
  LanguageDto code(String code);

  LanguageDto name(String name);

  LanguageDto nativeName(String nativeName);

  LanguageDto direction(LanguageDtoDirectionEnum direction);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LanguageDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LanguageDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LanguageDto call({
    String code,
    String name,
    String nativeName,
    LanguageDtoDirectionEnum direction,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLanguageDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLanguageDto.copyWith.fieldName(...)`
class _$LanguageDtoCWProxyImpl implements _$LanguageDtoCWProxy {
  const _$LanguageDtoCWProxyImpl(this._value);

  final LanguageDto _value;

  @override
  LanguageDto code(String code) => this(code: code);

  @override
  LanguageDto name(String name) => this(name: name);

  @override
  LanguageDto nativeName(String nativeName) => this(nativeName: nativeName);

  @override
  LanguageDto direction(LanguageDtoDirectionEnum direction) =>
      this(direction: direction);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LanguageDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LanguageDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LanguageDto call({
    Object? code = const $CopyWithPlaceholder(),
    Object? name = const $CopyWithPlaceholder(),
    Object? nativeName = const $CopyWithPlaceholder(),
    Object? direction = const $CopyWithPlaceholder(),
  }) {
    return LanguageDto(
      code: code == const $CopyWithPlaceholder()
          ? _value.code
          // ignore: cast_nullable_to_non_nullable
          : code as String,
      name: name == const $CopyWithPlaceholder()
          ? _value.name
          // ignore: cast_nullable_to_non_nullable
          : name as String,
      nativeName: nativeName == const $CopyWithPlaceholder()
          ? _value.nativeName
          // ignore: cast_nullable_to_non_nullable
          : nativeName as String,
      direction: direction == const $CopyWithPlaceholder()
          ? _value.direction
          // ignore: cast_nullable_to_non_nullable
          : direction as LanguageDtoDirectionEnum,
    );
  }
}

extension $LanguageDtoCopyWith on LanguageDto {
  /// Returns a callable class that can be used as follows: `instanceOfLanguageDto.copyWith(...)` or like so:`instanceOfLanguageDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LanguageDtoCWProxy get copyWith => _$LanguageDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LanguageDto _$LanguageDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LanguageDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const ['code', 'name', 'nativeName', 'direction'],
      );
      final val = LanguageDto(
        code: $checkedConvert('code', (v) => v as String),
        name: $checkedConvert('name', (v) => v as String),
        nativeName: $checkedConvert('nativeName', (v) => v as String),
        direction: $checkedConvert(
          'direction',
          (v) => $enumDecode(
            _$LanguageDtoDirectionEnumEnumMap,
            v,
            unknownValue: LanguageDtoDirectionEnum.unknownDefaultOpenApi,
          ),
        ),
      );
      return val;
    });

Map<String, dynamic> _$LanguageDtoToJson(LanguageDto instance) =>
    <String, dynamic>{
      'code': instance.code,
      'name': instance.name,
      'nativeName': instance.nativeName,
      'direction': _$LanguageDtoDirectionEnumEnumMap[instance.direction]!,
    };

const _$LanguageDtoDirectionEnumEnumMap = {
  LanguageDtoDirectionEnum.LTR: 'LTR',
  LanguageDtoDirectionEnum.RTL: 'RTL',
  LanguageDtoDirectionEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
