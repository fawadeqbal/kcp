//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/practice_quiz_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'practice_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PracticeDto {
  /// Returns a new [PracticeDto] instance.
  PracticeDto({
    required this.day,

    required this.xp,

    required this.total,

    required this.done,

    required this.answeredQuizIds,

    required this.quizzes,
  });

  @JsonKey(name: r'day', required: true, includeIfNull: false)
  final String day;

  /// XP for finishing today's practice.
  @JsonKey(name: r'xp', required: true, includeIfNull: false)
  final num xp;

  @JsonKey(name: r'total', required: true, includeIfNull: false)
  final num total;

  @JsonKey(name: r'done', required: true, includeIfNull: false)
  final bool done;

  /// Quizzes of today's practice already answered correctly today.
  @JsonKey(name: r'answeredQuizIds', required: true, includeIfNull: false)
  final List<String> answeredQuizIds;

  @JsonKey(name: r'quizzes', required: true, includeIfNull: false)
  final List<PracticeQuizDto> quizzes;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PracticeDto &&
          other.day == day &&
          other.xp == xp &&
          other.total == total &&
          other.done == done &&
          other.answeredQuizIds == answeredQuizIds &&
          other.quizzes == quizzes;

  @override
  int get hashCode =>
      day.hashCode +
      xp.hashCode +
      total.hashCode +
      done.hashCode +
      answeredQuizIds.hashCode +
      quizzes.hashCode;

  factory PracticeDto.fromJson(Map<String, dynamic> json) =>
      _$PracticeDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PracticeDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
