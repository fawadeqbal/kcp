// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'role_summary_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$RoleSummaryDtoCWProxy {
  RoleSummaryDto key(String key);

  RoleSummaryDto name(String name);

  RoleSummaryDto isStaff(bool isStaff);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `RoleSummaryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// RoleSummaryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  RoleSummaryDto call({String key, String name, bool isStaff});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfRoleSummaryDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfRoleSummaryDto.copyWith.fieldName(...)`
class _$RoleSummaryDtoCWProxyImpl implements _$RoleSummaryDtoCWProxy {
  const _$RoleSummaryDtoCWProxyImpl(this._value);

  final RoleSummaryDto _value;

  @override
  RoleSummaryDto key(String key) => this(key: key);

  @override
  RoleSummaryDto name(String name) => this(name: name);

  @override
  RoleSummaryDto isStaff(bool isStaff) => this(isStaff: isStaff);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `RoleSummaryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// RoleSummaryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  RoleSummaryDto call({
    Object? key = const $CopyWithPlaceholder(),
    Object? name = const $CopyWithPlaceholder(),
    Object? isStaff = const $CopyWithPlaceholder(),
  }) {
    return RoleSummaryDto(
      key: key == const $CopyWithPlaceholder()
          ? _value.key
          // ignore: cast_nullable_to_non_nullable
          : key as String,
      name: name == const $CopyWithPlaceholder()
          ? _value.name
          // ignore: cast_nullable_to_non_nullable
          : name as String,
      isStaff: isStaff == const $CopyWithPlaceholder()
          ? _value.isStaff
          // ignore: cast_nullable_to_non_nullable
          : isStaff as bool,
    );
  }
}

extension $RoleSummaryDtoCopyWith on RoleSummaryDto {
  /// Returns a callable class that can be used as follows: `instanceOfRoleSummaryDto.copyWith(...)` or like so:`instanceOfRoleSummaryDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$RoleSummaryDtoCWProxy get copyWith => _$RoleSummaryDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RoleSummaryDto _$RoleSummaryDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('RoleSummaryDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['key', 'name', 'isStaff']);
      final val = RoleSummaryDto(
        key: $checkedConvert('key', (v) => v as String),
        name: $checkedConvert('name', (v) => v as String),
        isStaff: $checkedConvert('isStaff', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$RoleSummaryDtoToJson(RoleSummaryDto instance) =>
    <String, dynamic>{
      'key': instance.key,
      'name': instance.name,
      'isStaff': instance.isStaff,
    };
