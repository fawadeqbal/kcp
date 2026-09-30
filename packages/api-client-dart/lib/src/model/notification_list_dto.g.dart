// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'notification_list_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$NotificationListDtoCWProxy {
  NotificationListDto unread(num unread);

  NotificationListDto items(List<NotificationDto> items);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `NotificationListDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// NotificationListDto(...).copyWith(id: 12, name: "My name")
  /// ````
  NotificationListDto call({num unread, List<NotificationDto> items});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfNotificationListDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfNotificationListDto.copyWith.fieldName(...)`
class _$NotificationListDtoCWProxyImpl implements _$NotificationListDtoCWProxy {
  const _$NotificationListDtoCWProxyImpl(this._value);

  final NotificationListDto _value;

  @override
  NotificationListDto unread(num unread) => this(unread: unread);

  @override
  NotificationListDto items(List<NotificationDto> items) => this(items: items);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `NotificationListDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// NotificationListDto(...).copyWith(id: 12, name: "My name")
  /// ````
  NotificationListDto call({
    Object? unread = const $CopyWithPlaceholder(),
    Object? items = const $CopyWithPlaceholder(),
  }) {
    return NotificationListDto(
      unread: unread == const $CopyWithPlaceholder()
          ? _value.unread
          // ignore: cast_nullable_to_non_nullable
          : unread as num,
      items: items == const $CopyWithPlaceholder()
          ? _value.items
          // ignore: cast_nullable_to_non_nullable
          : items as List<NotificationDto>,
    );
  }
}

extension $NotificationListDtoCopyWith on NotificationListDto {
  /// Returns a callable class that can be used as follows: `instanceOfNotificationListDto.copyWith(...)` or like so:`instanceOfNotificationListDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$NotificationListDtoCWProxy get copyWith =>
      _$NotificationListDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

NotificationListDto _$NotificationListDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('NotificationListDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['unread', 'items']);
      final val = NotificationListDto(
        unread: $checkedConvert('unread', (v) => v as num),
        items: $checkedConvert(
          'items',
          (v) => (v as List<dynamic>)
              .map((e) => NotificationDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$NotificationListDtoToJson(
  NotificationListDto instance,
) => <String, dynamic>{
  'unread': instance.unread,
  'items': instance.items.map((e) => e.toJson()).toList(),
};
