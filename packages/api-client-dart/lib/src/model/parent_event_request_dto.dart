//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/parent_event_request_dto_child.dart';
import 'package:kcp_api/src/model/parent_event_request_dto_team.dart';
import 'package:kcp_api/src/model/parent_event_request_dto_event.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'parent_event_request_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ParentEventRequestDto {
  /// Returns a new [ParentEventRequestDto] instance.
  ParentEventRequestDto({
    required this.teamId,

    required this.child,

    required this.event,

    required this.team,

    required this.requestedAt,
  });

  @JsonKey(name: r'teamId', required: true, includeIfNull: false)
  final String teamId;

  @JsonKey(name: r'child', required: true, includeIfNull: false)
  final ParentEventRequestDtoChild child;

  @JsonKey(name: r'event', required: true, includeIfNull: false)
  final ParentEventRequestDtoEvent event;

  @JsonKey(name: r'team', required: true, includeIfNull: false)
  final ParentEventRequestDtoTeam team;

  @JsonKey(name: r'requestedAt', required: true, includeIfNull: false)
  final DateTime requestedAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ParentEventRequestDto &&
          other.teamId == teamId &&
          other.child == child &&
          other.event == event &&
          other.team == team &&
          other.requestedAt == requestedAt;

  @override
  int get hashCode =>
      teamId.hashCode +
      child.hashCode +
      event.hashCode +
      team.hashCode +
      requestedAt.hashCode;

  factory ParentEventRequestDto.fromJson(Map<String, dynamic> json) =>
      _$ParentEventRequestDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ParentEventRequestDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
