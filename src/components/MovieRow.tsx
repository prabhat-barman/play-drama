import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import type {Movie} from '../types/movie';
import {colors, spacing} from '../theme/colors';
import {MovieCard} from './MovieCard';

type Props = {
  title: string;
  movies: Movie[];
  onPressMovie: (movie: Movie) => void;
};

export function MovieRow({title, movies, onPressMovie}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={movies}
        keyExtractor={(m, idx) => (m.id ? `${m.id}-${idx}` : `movie-${idx}`)}
        renderItem={({item}) => (
          <MovieCard movie={item} onPress={() => onPressMovie(item)} />
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginLeft: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  list: {
    paddingHorizontal: spacing.md,
  },
  sep: {
    width: spacing.sm + 2,
  },
});
