//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'parent_event_request_dto_event.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ParentEventRequestDtoEvent {
  /// Returns a new [ParentEventRequestDtoEvent] instance.
  ParentEventRequestDtoEvent({
    required this.slug,

    required this.title,

    required this.startsAt,

    required this.endsAt,
  });

  @JsonKey(name: r'slug', required: true, includeIfNull: false)
  final String slug;

  @JsonKey(name: r'title', required: true, includeIfNull: false)
  final String title;

  @JsonKey(name: r'startsAt', required: true, includeIfNull: false)
  final DateTime startsAt;

  @JsonKey(name: r'endsAt', required: true, includeIfNull: false)
  final DateTime endsAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ParentEventRequestDtoEvent &&
          other.slug == slug &&
          other.title == title &&
          other.startsAt == startsAt &&
          other.endsAt == endsAt;

  @override
  int get hashCode =>
      slug.hashCode + title.hashCode + startsAt.hashCode + endsAt.hashCode;

  factory ParentEventRequestDtoEvent.fromJson(Map<String, dynamic> json) =>
      _$ParentEventRequestDtoEventFromJson(json);

  Map<String, dynamic> toJson() => _$ParentEventRequestDtoEventToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
