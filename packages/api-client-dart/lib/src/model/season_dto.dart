//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'season_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class SeasonDto {
  /// Returns a new [SeasonDto] instance.
  SeasonDto({
    required this.id,

    required this.name,

    required this.startDay,

    required this.endDay,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'name', required: true, includeIfNull: false)
  final String name;

  @JsonKey(name: r'startDay', required: true, includeIfNull: false)
  final String startDay;

  /// The day after the last day; null while the end isn't planned.
  @JsonKey(name: r'endDay', required: true, includeIfNull: true)
  final String? endDay;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SeasonDto &&
          other.id == id &&
          other.name == name &&
          other.startDay == startDay &&
          other.endDay == endDay;

  @override
  int get hashCode =>
      id.hashCode +
      name.hashCode +
      startDay.hashCode +
      (endDay == null ? 0 : endDay.hashCode);

  factory SeasonDto.fromJson(Map<String, dynamic> json) =>
      _$SeasonDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SeasonDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
