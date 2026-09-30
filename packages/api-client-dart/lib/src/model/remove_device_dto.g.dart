// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'remove_device_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$RemoveDeviceDtoCWProxy {
  RemoveDeviceDto token(String token);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `RemoveDeviceDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// RemoveDeviceDto(...).copyWith(id: 12, name: "My name")
  /// ````
  RemoveDeviceDto call({String token});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfRemoveDeviceDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfRemoveDeviceDto.copyWith.fieldName(...)`
class _$RemoveDeviceDtoCWProxyImpl implements _$RemoveDeviceDtoCWProxy {
  const _$RemoveDeviceDtoCWProxyImpl(this._value);

  final RemoveDeviceDto _value;

  @override
  RemoveDeviceDto token(String token) => this(token: token);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `RemoveDeviceDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// RemoveDeviceDto(...).copyWith(id: 12, name: "My name")
  /// ````
  RemoveDeviceDto call({Object? token = const $CopyWithPlaceholder()}) {
    return RemoveDeviceDto(
      token: token == const $CopyWithPlaceholder()
          ? _value.token
          // ignore: cast_nullable_to_non_nullable
          : token as String,
    );
  }
}

extension $RemoveDeviceDtoCopyWith on RemoveDeviceDto {
  /// Returns a callable class that can be used as follows: `instanceOfRemoveDeviceDto.copyWith(...)` or like so:`instanceOfRemoveDeviceDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$RemoveDeviceDtoCWProxy get copyWith => _$RemoveDeviceDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RemoveDeviceDto _$RemoveDeviceDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('RemoveDeviceDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['token']);
      final val = RemoveDeviceDto(
        token: $checkedConvert('token', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$RemoveDeviceDtoToJson(RemoveDeviceDto instance) =>
    <String, dynamic>{'token': instance.token};
