// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'parent_event_request_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ParentEventRequestDtoCWProxy {
  ParentEventRequestDto teamId(String teamId);

  ParentEventRequestDto child(ParentEventRequestDtoChild child);

  ParentEventRequestDto event(ParentEventRequestDtoEvent event);

  ParentEventRequestDto team(ParentEventRequestDtoTeam team);

  ParentEventRequestDto requestedAt(DateTime requestedAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentEventRequestDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentEventRequestDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentEventRequestDto call({
    String teamId,
    ParentEventRequestDtoChild child,
    ParentEventRequestDtoEvent event,
    ParentEventRequestDtoTeam team,
    DateTime requestedAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfParentEventRequestDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfParentEventRequestDto.copyWith.fieldName(...)`
class _$ParentEventRequestDtoCWProxyImpl
    implements _$ParentEventRequestDtoCWProxy {
  const _$ParentEventRequestDtoCWProxyImpl(this._value);

  final ParentEventRequestDto _value;

  @override
  ParentEventRequestDto teamId(String teamId) => this(teamId: teamId);

  @override
  ParentEventRequestDto child(ParentEventRequestDtoChild child) =>
      this(child: child);

  @override
  ParentEventRequestDto event(ParentEventRequestDtoEvent event) =>
      this(event: event);

  @override
  ParentEventRequestDto team(ParentEventRequestDtoTeam team) =>
      this(team: team);

  @override
  ParentEventRequestDto requestedAt(DateTime requestedAt) =>
      this(requestedAt: requestedAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentEventRequestDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentEventRequestDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentEventRequestDto call({
    Object? teamId = const $CopyWithPlaceholder(),
    Object? child = const $CopyWithPlaceholder(),
    Object? event = const $CopyWithPlaceholder(),
    Object? team = const $CopyWithPlaceholder(),
    Object? requestedAt = const $CopyWithPlaceholder(),
  }) {
    return ParentEventRequestDto(
      teamId: teamId == const $CopyWithPlaceholder()
          ? _value.teamId
          // ignore: cast_nullable_to_non_nullable
          : teamId as String,
      child: child == const $CopyWithPlaceholder()
          ? _value.child
          // ignore: cast_nullable_to_non_nullable
          : child as ParentEventRequestDtoChild,
      event: event == const $CopyWithPlaceholder()
          ? _value.event
          // ignore: cast_nullable_to_non_nullable
          : event as ParentEventRequestDtoEvent,
      team: team == const $CopyWithPlaceholder()
          ? _value.team
          // ignore: cast_nullable_to_non_nullable
          : team as ParentEventRequestDtoTeam,
      requestedAt: requestedAt == const $CopyWithPlaceholder()
          ? _value.requestedAt
          // ignore: cast_nullable_to_non_nullable
          : requestedAt as DateTime,
    );
  }
}

extension $ParentEventRequestDtoCopyWith on ParentEventRequestDto {
  /// Returns a callable class that can be used as follows: `instanceOfParentEventRequestDto.copyWith(...)` or like so:`instanceOfParentEventRequestDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ParentEventRequestDtoCWProxy get copyWith =>
      _$ParentEventRequestDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ParentEventRequestDto _$ParentEventRequestDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ParentEventRequestDto', json, ($checkedConvert) {
  $checkKeys(
    json,
    requiredKeys: const ['teamId', 'child', 'event', 'team', 'requestedAt'],
  );
  final val = ParentEventRequestDto(
    teamId: $checkedConvert('teamId', (v) => v as String),
    child: $checkedConvert(
      'child',
      (v) => ParentEventRequestDtoChild.fromJson(v as Map<String, dynamic>),
    ),
    event: $checkedConvert(
      'event',
      (v) => ParentEventRequestDtoEvent.fromJson(v as Map<String, dynamic>),
    ),
    team: $checkedConvert(
      'team',
      (v) => ParentEventRequestDtoTeam.fromJson(v as Map<String, dynamic>),
    ),
    requestedAt: $checkedConvert(
      'requestedAt',
      (v) => DateTime.parse(v as String),
    ),
  );
  return val;
});

Map<String, dynamic> _$ParentEventRequestDtoToJson(
  ParentEventRequestDto instance,
) => <String, dynamic>{
  'teamId': instance.teamId,
  'child': instance.child.toJson(),
  'event': instance.event.toJson(),
  'team': instance.team.toJson(),
  'requestedAt': instance.requestedAt.toIso8601String(),
};
