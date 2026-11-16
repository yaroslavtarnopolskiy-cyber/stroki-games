using System.Collections;
using UnityEngine;

public class MusicPlayer : MonoBehaviour
{
    public AudioSource source;
    public float fade = 1f;        // секунд на затухание и на нарастание
    public float volume = 0.6f;

    AudioClip playing;
    Coroutine routine;

    void Start()
    {
        GameManager.I.CardDrawn += OnCard;
        if (GameManager.I.Current != null) OnCard(GameManager.I.Current);
    }

    void OnDestroy()
    {
        if (GameManager.I) GameManager.I.CardDrawn -= OnCard;
    }

    void OnCard(CardData c)
    {
        if ((c.musicName ?? "").ToLowerInvariant() == "stop") Switch(null);
        else if (c.music != null && c.music != playing) Switch(c.music);
        // колонка пустая: ничего не меняем
    }

    void Switch(AudioClip next)
    {
        playing = next;
        if (routine != null) StopCoroutine(routine);
        routine = StartCoroutine(Change(next));
    }

    IEnumerator Change(AudioClip next)
    {
        float from = source.volume;
        for (float t = 0; t < fade; t += Time.deltaTime)
        {
            source.volume = Mathf.Lerp(from, 0, t / fade);
            yield return null;
        }
        source.Stop();
        if (next == null) yield break;

        source.clip = next;
        source.loop = true;
        source.Play();
        for (float t = 0; t < fade; t += Time.deltaTime)
        {
            source.volume = Mathf.Lerp(0, volume, t / fade);
            yield return null;
        }
        source.volume = volume;
    }
}