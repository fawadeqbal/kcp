// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'notification_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$NotificationDtoCWProxy {
  NotificationDto id(String id);

  NotificationDto type(String type);

  NotificationDto data(Map<String, Object> data);

  NotificationDto read(bool read);

  NotificationDto createdAt(DateTime createdAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `NotificationDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// NotificationDto(...).copyWith(id: 12, name: "My name")
  /// ````
  NotificationDto call({
    String id,
    String type,
    Map<String, Object> data,
    bool read,
    DateTime createdAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfNotificationDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfNotificationDto.copyWith.fieldName(...)`
class _$NotificationDtoCWProxyImpl implements _$NotificationDtoCWProxy {
  const _$NotificationDtoCWProxyImpl(this._value);

  final NotificationDto _value;

  @override
  NotificationDto id(String id) => this(id: id);

  @override
  NotificationDto type(String type) => this(type: type);

  @override
  NotificationDto data(Map<String, Object> data) => this(data: data);

  @override
  NotificationDto read(bool read) => this(read: read);

  @override
  NotificationDto createdAt(DateTime createdAt) => this(createdAt: createdAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `NotificationDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// NotificationDto(...).copyWith(id: 12, name: "My name")
  /// ````
  NotificationDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? type = const $CopyWithPlaceholder(),
    Object? data = const $CopyWithPlaceholder(),
    Object? read = const $CopyWithPlaceholder(),
    Object? createdAt = const $CopyWithPlaceholder(),
  }) {
    return NotificationDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      type: type == const $CopyWithPlaceholder()
          ? _value.type
          // ignore: cast_nullable_to_non_nullable
          : type as String,
      data: data == const $CopyWithPlaceholder()
          ? _value.data
          // ignore: cast_nullable_to_non_nullable
          : data as Map<String, Object>,
      read: read == const $CopyWithPlaceholder()
          ? _value.read
          // ignore: cast_nullable_to_non_nullable
          : read as bool,
      createdAt: createdAt == const $CopyWithPlaceholder()
          ? _value.createdAt
          // ignore: cast_nullable_to_non_nullable
          : createdAt as DateTime,
    );
  }
}

extension $NotificationDtoCopyWith on NotificationDto {
  /// Returns a callable class that can be used as follows: `instanceOfNotificationDto.copyWith(...)` or like so:`instanceOfNotificationDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$NotificationDtoCWProxy get copyWith => _$NotificationDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

NotificationDto _$NotificationDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('NotificationDto', json, ($checkedConvert) {
  $checkKeys(
    json,
    requiredKeys: const ['id', 'type', 'data', 'read', 'createdAt'],
  );
  final val = NotificationDto(
    id: $checkedConvert('id', (v) => v as String),
    type: $checkedConvert('type', (v) => v as String),
    data: $checkedConvert(
      'data',
      (v) =>
          (v as Map<String, dynamic>).map((k, e) => MapEntry(k, e as Object)),
    ),
    read: $checkedConvert('read', (v) => v as bool),
    createdAt: $checkedConvert('createdAt', (v) => DateTime.parse(v as String)),
  );
  return val;
});

Map<String, dynamic> _$NotificationDtoToJson(NotificationDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': instance.type,
      'data': instance.data,
      'read': instance.read,
      'createdAt': instance.createdAt.toIso8601String(),
    };
