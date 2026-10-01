//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'parent_event_request_dto_team.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ParentEventRequestDtoTeam {
  /// Returns a new [ParentEventRequestDtoTeam] instance.
  ParentEventRequestDtoTeam({required this.name, required this.members});

  @JsonKey(name: r'name', required: true, includeIfNull: false)
  final String name;

  @JsonKey(name: r'members', required: true, includeIfNull: false)
  final List<String> members;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ParentEventRequestDtoTeam &&
          other.name == name &&
          other.members == members;

  @override
  int get hashCode => name.hashCode + members.hashCode;

  factory ParentEventRequestDtoTeam.fromJson(Map<String, dynamic> json) =>
      _$ParentEventRequestDtoTeamFromJson(json);

  Map<String, dynamic> toJson() => _$ParentEventRequestDtoTeamToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
