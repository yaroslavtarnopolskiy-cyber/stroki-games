using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager I { get; private set; }

    public SheetSource source;
    public int stats = 50;

    public event Action<int> StatsChanged;
    public event Action<CardData> CardDrawn;
    public event Action<bool> GameOver;   // true = упал до 0, false = дошёл до 100

    public CardData Current { get; private set; }

    List<CardData> story = new List<CardData>();
    List<CardData> endings = new List<CardData>();
    CardData book;
    int nextIndex;
    bool inEnding;   // сейчас показана концовка

    static string T(CardData c) => c.type ?? "";

    void Awake() => I = this;

    void Start()
    {
        if (source == null)
        {
            Debug.LogError("GameManager: не назначен Source (ассет CardsSheet).");
            return;
        }
        StartGame(source.cards);
    }

    public void StartGame(List<CardData> cards)
    {
        story = cards.Where(c => T(c) == "" || T(c) == "story")
                     .OrderBy(c => c.choice_number).ToList();
        endings = cards.Where(c => T(c).StartsWith("ending")).ToList();
        book = cards.FirstOrDefault(c => T(c) == "book");

        nextIndex = 0;
        inEnding = false;
        stats = 50;
        StatsChanged?.Invoke(stats);
        DrawCard();
    }

    void Show(CardData card)
    {
        Current = card;
        CardDrawn?.Invoke(card);
    }

    public void DrawCard()
    {
        if (story.Count == 0)
        {
            Debug.LogError("GameManager: нет сюжетных карточек. Нажми Sync на ассете CardsSheet.");
            return;
        }

        if (nextIndex >= story.Count)
        {
            ShowEnding("ending_final");
            return;
        }

        Show(story[nextIndex++]);
    }

    void ShowEnding(string type)
    {
        inEnding = true;
        var options = endings.Where(c => T(c) == type).ToList();

        if (options.Count == 0)
        {
            Debug.LogWarning("В таблице нет карточки с type = " + type);
            if (book != null) Show(book);
            else StartGame(source.cards);
            return;
        }

        Show(options[UnityEngine.Random.Range(0, options.Count)]);
    }

    public void Choose(bool right)
    {
        // карточка с книгой: вправо открывает ссылку, влево начинает заново
        if (T(Current) == "book")
        {
            if (!right)
            {
                Application.OpenURL(Current.url);
                Show(Current);   // остаёмся на этой карточке
            }
            else StartGame(source.cards);
            return;
        }

        // концовка: дальше книга, если она есть, иначе рестарт
        if (inEnding)
        {
            if (book != null) Show(book);
            else StartGame(source.cards);
            return;
        }

        // обычная карточка
        var c = right ? Current.right : Current.left;
        stats = Mathf.Clamp(stats + c.scale, 0, 100);
        StatsChanged?.Invoke(stats);

        if (stats <= 0)   { GameOver?.Invoke(true);  ShowEnding("ending_low");  return; }
        if (stats >= 100) { GameOver?.Invoke(false); ShowEnding("ending_high"); return; }

        DrawCard();
    }
}
