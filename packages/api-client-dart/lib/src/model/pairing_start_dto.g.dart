// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pairing_start_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PairingStartDtoCWProxy {
  PairingStartDto app(PairingStartDtoAppEnum app);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingStartDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingStartDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingStartDto call({PairingStartDtoAppEnum app});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPairingStartDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPairingStartDto.copyWith.fieldName(...)`
class _$PairingStartDtoCWProxyImpl implements _$PairingStartDtoCWProxy {
  const _$PairingStartDtoCWProxyImpl(this._value);

  final PairingStartDto _value;

  @override
  PairingStartDto app(PairingStartDtoAppEnum app) => this(app: app);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingStartDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingStartDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingStartDto call({Object? app = const $CopyWithPlaceholder()}) {
    return PairingStartDto(
      app: app == const $CopyWithPlaceholder()
          ? _value.app
          // ignore: cast_nullable_to_non_nullable
          : app as PairingStartDtoAppEnum,
    );
  }
}

extension $PairingStartDtoCopyWith on PairingStartDto {
  /// Returns a callable class that can be used as follows: `instanceOfPairingStartDto.copyWith(...)` or like so:`instanceOfPairingStartDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PairingStartDtoCWProxy get copyWith => _$PairingStartDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PairingStartDto _$PairingStartDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PairingStartDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['app']);
      final val = PairingStartDto(
        app: $checkedConvert(
          'app',
          (v) => $enumDecode(
            _$PairingStartDtoAppEnumEnumMap,
            v,
            unknownValue: PairingStartDtoAppEnum.unknownDefaultOpenApi,
          ),
        ),
      );
      return val;
    });

Map<String, dynamic> _$PairingStartDtoToJson(PairingStartDto instance) =>
    <String, dynamic>{'app': _$PairingStartDtoAppEnumEnumMap[instance.app]!};

const _$PairingStartDtoAppEnumEnumMap = {
  PairingStartDtoAppEnum.web: 'web',
  PairingStartDtoAppEnum.mobile: 'mobile',
  PairingStartDtoAppEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
