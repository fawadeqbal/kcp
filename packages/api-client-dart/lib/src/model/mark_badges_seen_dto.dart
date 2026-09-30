//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'mark_badges_seen_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class MarkBadgesSeenDto {
  /// Returns a new [MarkBadgesSeenDto] instance.
  MarkBadgesSeenDto({required this.keys});

  @JsonKey(name: r'keys', required: true, includeIfNull: false)
  final List<String> keys;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MarkBadgesSeenDto && other.keys == keys;

  @override
  int get hashCode => keys.hashCode;

  factory MarkBadgesSeenDto.fromJson(Map<String, dynamic> json) =>
      _$MarkBadgesSeenDtoFromJson(json);

  Map<String, dynamic> toJson() => _$MarkBadgesSeenDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
