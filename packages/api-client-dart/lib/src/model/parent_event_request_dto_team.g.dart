// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'parent_event_request_dto_team.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ParentEventRequestDtoTeamCWProxy {
  ParentEventRequestDtoTeam name(String name);

  ParentEventRequestDtoTeam members(List<String> members);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentEventRequestDtoTeam(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentEventRequestDtoTeam(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentEventRequestDtoTeam call({String name, List<String> members});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfParentEventRequestDtoTeam.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfParentEventRequestDtoTeam.copyWith.fieldName(...)`
class _$ParentEventRequestDtoTeamCWProxyImpl
    implements _$ParentEventRequestDtoTeamCWProxy {
  const _$ParentEventRequestDtoTeamCWProxyImpl(this._value);

  final ParentEventRequestDtoTeam _value;

  @override
  ParentEventRequestDtoTeam name(String name) => this(name: name);

  @override
  ParentEventRequestDtoTeam members(List<String> members) =>
      this(members: members);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentEventRequestDtoTeam(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentEventRequestDtoTeam(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentEventRequestDtoTeam call({
    Object? name = const $CopyWithPlaceholder(),
    Object? members = const $CopyWithPlaceholder(),
  }) {
    return ParentEventRequestDtoTeam(
      name: name == const $CopyWithPlaceholder()
          ? _value.name
          // ignore: cast_nullable_to_non_nullable
          : name as String,
      members: members == const $CopyWithPlaceholder()
          ? _value.members
          // ignore: cast_nullable_to_non_nullable
          : members as List<String>,
    );
  }
}

extension $ParentEventRequestDtoTeamCopyWith on ParentEventRequestDtoTeam {
  /// Returns a callable class that can be used as follows: `instanceOfParentEventRequestDtoTeam.copyWith(...)` or like so:`instanceOfParentEventRequestDtoTeam.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ParentEventRequestDtoTeamCWProxy get copyWith =>
      _$ParentEventRequestDtoTeamCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ParentEventRequestDtoTeam _$ParentEventRequestDtoTeamFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ParentEventRequestDtoTeam', json, ($checkedConvert) {
  $checkKeys(json, requiredKeys: const ['name', 'members']);
  final val = ParentEventRequestDtoTeam(
    name: $checkedConvert('name', (v) => v as String),
    members: $checkedConvert(
      'members',
      (v) => (v as List<dynamic>).map((e) => e as String).toList(),
    ),
  );
  return val;
});

Map<String, dynamic> _$ParentEventRequestDtoTeamToJson(
  ParentEventRequestDtoTeam instance,
) => <String, dynamic>{'name': instance.name, 'members': instance.members};
