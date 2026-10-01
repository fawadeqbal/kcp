// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'parent_event_request_dto_event.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ParentEventRequestDtoEventCWProxy {
  ParentEventRequestDtoEvent slug(String slug);

  ParentEventRequestDtoEvent title(String title);

  ParentEventRequestDtoEvent startsAt(DateTime startsAt);

  ParentEventRequestDtoEvent endsAt(DateTime endsAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentEventRequestDtoEvent(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentEventRequestDtoEvent(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentEventRequestDtoEvent call({
    String slug,
    String title,
    DateTime startsAt,
    DateTime endsAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfParentEventRequestDtoEvent.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfParentEventRequestDtoEvent.copyWith.fieldName(...)`
class _$ParentEventRequestDtoEventCWProxyImpl
    implements _$ParentEventRequestDtoEventCWProxy {
  const _$ParentEventRequestDtoEventCWProxyImpl(this._value);

  final ParentEventRequestDtoEvent _value;

  @override
  ParentEventRequestDtoEvent slug(String slug) => this(slug: slug);

  @override
  ParentEventRequestDtoEvent title(String title) => this(title: title);

  @override
  ParentEventRequestDtoEvent startsAt(DateTime startsAt) =>
      this(startsAt: startsAt);

  @override
  ParentEventRequestDtoEvent endsAt(DateTime endsAt) => this(endsAt: endsAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentEventRequestDtoEvent(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentEventRequestDtoEvent(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentEventRequestDtoEvent call({
    Object? slug = const $CopyWithPlaceholder(),
    Object? title = const $CopyWithPlaceholder(),
    Object? startsAt = const $CopyWithPlaceholder(),
    Object? endsAt = const $CopyWithPlaceholder(),
  }) {
    return ParentEventRequestDtoEvent(
      slug: slug == const $CopyWithPlaceholder()
          ? _value.slug
          // ignore: cast_nullable_to_non_nullable
          : slug as String,
      title: title == const $CopyWithPlaceholder()
          ? _value.title
          // ignore: cast_nullable_to_non_nullable
          : title as String,
      startsAt: startsAt == const $CopyWithPlaceholder()
          ? _value.startsAt
          // ignore: cast_nullable_to_non_nullable
          : startsAt as DateTime,
      endsAt: endsAt == const $CopyWithPlaceholder()
          ? _value.endsAt
          // ignore: cast_nullable_to_non_nullable
          : endsAt as DateTime,
    );
  }
}

extension $ParentEventRequestDtoEventCopyWith on ParentEventRequestDtoEvent {
  /// Returns a callable class that can be used as follows: `instanceOfParentEventRequestDtoEvent.copyWith(...)` or like so:`instanceOfParentEventRequestDtoEvent.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ParentEventRequestDtoEventCWProxy get copyWith =>
      _$ParentEventRequestDtoEventCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ParentEventRequestDtoEvent _$ParentEventRequestDtoEventFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ParentEventRequestDtoEvent', json, ($checkedConvert) {
  $checkKeys(json, requiredKeys: const ['slug', 'title', 'startsAt', 'endsAt']);
  final val = ParentEventRequestDtoEvent(
    slug: $checkedConvert('slug', (v) => v as String),
    title: $checkedConvert('title', (v) => v as String),
    startsAt: $checkedConvert('startsAt', (v) => DateTime.parse(v as String)),
    endsAt: $checkedConvert('endsAt', (v) => DateTime.parse(v as String)),
  );
  return val;
});

Map<String, dynamic> _$ParentEventRequestDtoEventToJson(
  ParentEventRequestDtoEvent instance,
) => <String, dynamic>{
  'slug': instance.slug,
  'title': instance.title,
  'startsAt': instance.startsAt.toIso8601String(),
  'endsAt': instance.endsAt.toIso8601String(),
};
