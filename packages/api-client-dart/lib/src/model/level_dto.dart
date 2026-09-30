//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'level_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LevelDto {
  /// Returns a new [LevelDto] instance.
  LevelDto({
    required this.number,

    required this.minXp,

    required this.nextMinXp,
  });

  @JsonKey(name: r'number', required: true, includeIfNull: false)
  final num number;

  /// XP at which this level starts.
  @JsonKey(name: r'minXp', required: true, includeIfNull: false)
  final num minXp;

  /// XP at which the next level starts; null at the top level.
  @JsonKey(name: r'nextMinXp', required: true, includeIfNull: true)
  final num? nextMinXp;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LevelDto &&
          other.number == number &&
          other.minXp == minXp &&
          other.nextMinXp == nextMinXp;

  @override
  int get hashCode =>
      number.hashCode +
      minXp.hashCode +
      (nextMinXp == null ? 0 : nextMinXp.hashCode);

  factory LevelDto.fromJson(Map<String, dynamic> json) =>
      _$LevelDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LevelDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
